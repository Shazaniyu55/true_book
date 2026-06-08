// import { Injectable } from '@nestjs/common';
// import { EntityManager } from 'typeorm';
// import { Usecase } from '@broker/types';
// import { KycService } from '../service/kyc.service';
// import { VerifyDriverNinDto } from '../dtos/kyc.dto';

// @Injectable()
// export class VerifyDriverNinUsecase extends Usecase {
//   constructor(private readonly kycService: KycService) {
//     super();
//   }

//   async execute(_entityManager: EntityManager, args: { id: string, dto:VerifyDriverNinDto }) {
//     return this.kycService.verifyDriverNin(args.id, args.dto);
//   }
// }