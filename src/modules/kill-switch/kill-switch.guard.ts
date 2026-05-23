import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KillSwitchService } from './kill-switch.service';
import { SERVICE_KEY } from '@shared/decorators/servicename.decorators';

/** Routes decorated with @SkipKillSwitch() are exempt (e.g. the kill-switch toggle endpoint itself) */
export const SKIP_KILL_SWITCH = 'skipKillSwitch';
export const SkipKillSwitch = () =>
  (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(SKIP_KILL_SWITCH, true, descriptor?.value ?? target);
  };

@Injectable()
export class KillSwitchGuard implements CanActivate {
  constructor(
    private readonly killSwitchService: KillSwitchService,
    private readonly reflector: Reflector,
  ) {}


  async canActivate(context: ExecutionContext): Promise<boolean> {
  const skip = this.reflector.get(SKIP_KILL_SWITCH, context.getHandler());
  if (skip) return true;

  const status = await this.killSwitchService.getStatus();
  if (!status.isActive) return true;

  // If killedServices is empty → entire API is down
  if (!status.killedServices?.length) {
    throw new ServiceUnavailableException('Service temporarily unavailable');
  }

  // Otherwise only kill the specific service
  const serviceName = this.reflector.get<string>(SERVICE_KEY, context.getHandler())
    ?? this.reflector.get<string>(SERVICE_KEY, context.getClass());

  if (serviceName && status.killedServices.includes(serviceName)) {
    throw new ServiceUnavailableException(`${serviceName} is temporarily unavailable`);
  }

  return true;
}


}
