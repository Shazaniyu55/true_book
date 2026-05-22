export enum Order {
  ASC = 'asc',
  DESC = 'desc',
  ASC_UPPER = 'ASC',
  DESC_UPPER = 'DESC',
}

export interface IQuery {
  limit?: number;
  page?: number;
  search?: string;
  order?: Order;
}
