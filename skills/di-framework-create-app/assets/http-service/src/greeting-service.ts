import { Container } from '@di-framework/core/decorators';

@Container()
export class GreetingService {
  greet(name: string): string {
    return `Hello, ${name}`;
  }
}
