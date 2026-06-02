import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';

import { Trip } from '@modules/core/entities/trip.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Escrow } from '@modules/core/entities/escro.entity';

import { TripStatus, BookingStatus, EscrowStatus  } from '../../../types/enums';
import { CreateDriverTripDto, UpdateDriverTripDto, CancelDriverTripDto, CompleteDriverTripDto } from '../dtos/create-driver.dto';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CREATE TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */



/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTIVATE TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */



/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANCEL TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */



/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPLETE TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */

