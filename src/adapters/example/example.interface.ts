export type ExampleDto = {
  to: string;
};

export interface IExample {
  send(sendExample: ExampleDto): Promise<void>;
}
