// import { Injectable } from '@nestjs/common';
// import { EntityManager } from 'typeorm';
// import { Usecase } from '@broker/types';
// import { KycService } from '../service/kyc.service';
// import { VerifyDriverBvnDto } from '../dtos/kyc.dto';

// @Injectable()
// export class VerifyDriverBvnUsecase extends Usecase {
//   constructor(private readonly kycService: KycService) {
//     super();
//   }

//   async execute(_entityManager: EntityManager, args: { id: string, dto:VerifyDriverBvnDto }) {
//     return this.kycService.verifyDriverBvn(args.id, args.dto);
//   }
// }