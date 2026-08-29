import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Trip } from '@modules/core/entities/trip.entity';
import { GeocodingService } from '@modules/geocoding/geocoding.service';
import { SystemSettingService } from '@modules/system/service/system.service';
import { PriceControlDto } from 'src/types/enums';
import {
  haversineKm,
  isInterStateTrip,
  resolveNigeriaState,
} from '@shared/utils/geo/nigeria-geo.util';

/** Defaults for the fare model when the admin hasn't configured price control. */
const FARE_DEFAULTS = {
  baseFare: 700, // NGN
  perKmRate: 45, // NGN per km
  interStateMultiplier: 1.15,
  priceBandPercent: 15, // driver may price within ±15% of the recommendation
  minTripPrice: 500,
  maxTripPrice: 200_000,
  defaultIntraStateFare: 2_500,
  defaultInterStateFare: 9_000,
};

export interface RouteEstimate {
  originState: string | null;
  destinationState: string | null;
  isInterState: boolean;
  distanceKm: number | null; // null when geocoding was unavailable
}

export interface PriceRecommendation extends RouteEstimate {
  currency: 'NGN';
  recommendedPricePerSeat: number;
  minPricePerSeat: number; // lower bound of the acceptable band
  maxPricePerSeat: number; // upper bound of the acceptable band (anti-exaggeration cap)
  bandPercent: number;
  basis: 'distance+history' | 'distance' | 'history' | 'default';
  sampleSize: number; // how many past trips fed the historical signal
}

export interface PriceEvaluation {
  ok: boolean;
  reason?: string;
  recommendation: PriceRecommendation;
  chosenPricePerSeat: number;
  withinBand: boolean;
}

export interface PassengerFareEstimate {
  seats: number;
  pricePerSeat: number;
  total: number;
}

@Injectable()
export class FareService {
  private readonly logger = new Logger(FareService.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    private readonly geocoding: GeocodingService,
    private readonly systemSettings: SystemSettingService,
  ) {}

  // ── Config ────────────────────────────────────────────────────────────────

  /** Merge admin price-control settings over the built-in defaults. Never throws. */
  private async config(): Promise<Required<Omit<PriceControlDto,
    'agentEarningAmount' | 'platformCommissionRate' | 'driverEarningRate' | 'fallbackPricePerKm'>>> {
    let settings: Partial<PriceControlDto> = {};
    try {
      settings = (await this.systemSettings.getPriceControl()) ?? {};
    } catch {
      // No price-control row yet — fall back to defaults silently.
    }
    return {
      baseFare: num(settings.baseFare, FARE_DEFAULTS.baseFare),
      perKmRate: num(settings.perKmRate, FARE_DEFAULTS.perKmRate),
      interStateMultiplier: num(settings.interStateMultiplier, FARE_DEFAULTS.interStateMultiplier),
      priceBandPercent: clamp(num(settings.priceBandPercent, FARE_DEFAULTS.priceBandPercent), 1, 100),
      minTripPrice: num(settings.minTripPrice, FARE_DEFAULTS.minTripPrice),
      maxTripPrice: num(settings.maxTripPrice, FARE_DEFAULTS.maxTripPrice),
      defaultIntraStateFare: num(settings.defaultIntraStateFare, FARE_DEFAULTS.defaultIntraStateFare),
      defaultInterStateFare: num(settings.defaultInterStateFare, FARE_DEFAULTS.defaultInterStateFare),
    };
  }

  // ── Route shape (states + distance) ─────────────────────────────────────────

  async estimateRoute(origin: string, destination: string): Promise<RouteEstimate> {
    const originState = resolveNigeriaState(origin);
    const destinationState = resolveNigeriaState(destination);
    const isInterState = isInterStateTrip(origin, destination);

    let distanceKm: number | null = null;
    try {
      const [a, b] = await this.geocoding.geocodeMany([origin, destination]);
      if (a && b) {
        distanceKm = round(haversineKm(a.lat, a.lng, b.lat, b.lng), 1);
      }
    } catch (err) {
      this.logger.warn(`Route geocoding failed for "${origin}" → "${destination}": ${err?.message}`);
    }

    return { originState, destinationState, isInterState, distanceKm };
  }

  // ── Historical signal ───────────────────────────────────────────────────────

  /**
   * Median per-seat price of recent, non-cancelled trips on the same route.
   * This keeps the recommendation grounded in what the market actually charges,
   * and lets it drift over time without code changes. Returns null when there
   * isn't enough history to be meaningful.
   */
  private async historicalMedian(
    origin: string,
    destination: string,
  ): Promise<{ median: number; sampleSize: number } | null> {
    try {
      const rows = await this.tripRepo
        .createQueryBuilder('trip')
        .select('CAST(trip.price AS NUMERIC)', 'price')
        .where('trip.status != :cancelled', { cancelled: 'cancelled' })
        .andWhere('trip.departureLocation ILIKE :o', { o: `%${firstToken(origin)}%` })
        .andWhere('CAST(trip.arrivalDestination AS TEXT) ILIKE :d', { d: `%${firstToken(destination)}%` })
        .orderBy('CAST(trip.price AS NUMERIC)', 'ASC')
        .getRawMany<{ price: string }>();

      const prices = rows
        .map((r) => Number(r.price))
        .filter((p) => Number.isFinite(p) && p > 0);

      if (prices.length < 3) return null; // too few to trust
      const mid = Math.floor(prices.length / 2);
      const median =
        prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
      return { median, sampleSize: prices.length };
    } catch (err) {
      this.logger.warn(`Historical median lookup failed: ${err?.message}`);
      return null;
    }
  }

  // ── The recommendation ──────────────────────────────────────────────────────

  async recommendPrice(origin: string, destination: string): Promise<PriceRecommendation> {
    const cfg = await this.config();
    const route = await this.estimateRoute(origin, destination);
    const history = await this.historicalMedian(origin, destination);

    // 1) Distance-based estimate (when we have a distance).
    let distanceEstimate: number | null = null;
    if (route.distanceKm != null) {
      const rate = route.isInterState
        ? cfg.perKmRate * cfg.interStateMultiplier
        : cfg.perKmRate;
      distanceEstimate = cfg.baseFare + rate * route.distanceKm;
    }

    // 2) Blend distance + history, or fall back gracefully.
    let recommended: number;
    let basis: PriceRecommendation['basis'];
    if (distanceEstimate != null && history) {
      recommended = 0.6 * distanceEstimate + 0.4 * history.median;
      basis = 'distance+history';
    } else if (distanceEstimate != null) {
      recommended = distanceEstimate;
      basis = 'distance';
    } else if (history) {
      recommended = history.median;
      basis = 'history';
    } else {
      recommended = route.isInterState ? cfg.defaultInterStateFare : cfg.defaultIntraStateFare;
      basis = 'default';
    }

    // 3) Clamp to the global min/max, then round to a tidy figure.
    recommended = clamp(recommended, cfg.minTripPrice, cfg.maxTripPrice);
    recommended = roundToNearest(recommended, 100);

    // 4) Acceptable band around the recommendation. The UPPER bound is the
    //    anti-exaggeration cap; it never exceeds the global maxTripPrice.
    const band = cfg.priceBandPercent / 100;
    const minPricePerSeat = Math.max(
      cfg.minTripPrice,
      roundToNearest(recommended * (1 - band), 100),
    );
    const maxPricePerSeat = Math.min(
      cfg.maxTripPrice,
      roundToNearest(recommended * (1 + band), 100),
    );

    return {
      ...route,
      currency: 'NGN',
      recommendedPricePerSeat: recommended,
      minPricePerSeat,
      maxPricePerSeat,
      bandPercent: cfg.priceBandPercent,
      basis,
      sampleSize: history?.sampleSize ?? 0,
    };
  }

  /**
   * Check a driver's chosen per-seat price against the recommended band.
   * Drivers may set anything inside [min, max]; going above the cap is blocked
   * (that's the exaggeration we're preventing), going below is allowed only
   * down to the band floor so the platform isn't undercut into unsafe pricing.
   */
  async evaluatePrice(
    origin: string,
    destination: string,
    chosenPricePerSeat: number,
  ): Promise<PriceEvaluation> {
    const recommendation = await this.recommendPrice(origin, destination);
    const { minPricePerSeat, maxPricePerSeat } = recommendation;

    if (chosenPricePerSeat > maxPricePerSeat) {
      return {
        ok: false,
        withinBand: false,
        chosenPricePerSeat,
        recommendation,
        reason:
          `Your price (₦${fmt(chosenPricePerSeat)}) is above the allowed maximum of ` +
          `₦${fmt(maxPricePerSeat)} for this route. The recommended fare is ` +
          `₦${fmt(recommendation.recommendedPricePerSeat)} per seat.`,
      };
    }

    if (chosenPricePerSeat < minPricePerSeat) {
      return {
        ok: false,
        withinBand: false,
        chosenPricePerSeat,
        recommendation,
        reason:
          `Your price (₦${fmt(chosenPricePerSeat)}) is below the allowed minimum of ` +
          `₦${fmt(minPricePerSeat)} for this route. The recommended fare is ` +
          `₦${fmt(recommendation.recommendedPricePerSeat)} per seat.`,
      };
    }

    return { ok: true, withinBand: true, chosenPricePerSeat, recommendation };
  }

  // ── Passenger-facing estimate for 1–4 seats (feature: unavailable-trip search) ──

  async estimateForPassengers(
    origin: string,
    destination: string,
    maxSeats = 4,
  ): Promise<{
    recommendation: PriceRecommendation;
    perSeat: number;
    seats: PassengerFareEstimate[];
  }> {
    const recommendation = await this.recommendPrice(origin, destination);
    const perSeat = recommendation.recommendedPricePerSeat;
    const cap = clamp(Math.floor(maxSeats), 1, 10);

    const seats: PassengerFareEstimate[] = [];
    for (let s = 1; s <= cap; s++) {
      seats.push({ seats: s, pricePerSeat: perSeat, total: perSeat * s });
    }
    return { recommendation, perSeat, seats };
  }
}

// ── small helpers ─────────────────────────────────────────────────────────────
function num(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
function round(v: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
function roundToNearest(v: number, step: number): number {
  return Math.max(step, Math.round(v / step) * step);
}
function firstToken(v: string): string {
  return String(v ?? '').trim().split(/[\s,]+/)[0] || String(v ?? '').trim();
}
function fmt(v: number): string {
  return Math.round(v).toLocaleString('en-NG');
}
