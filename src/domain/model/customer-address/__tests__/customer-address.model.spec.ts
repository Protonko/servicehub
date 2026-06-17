import { CustomerAddress } from '../customer-address.model';

describe('CustomerAddress', () => {
  it('trims required fields and normalizes empty optional strings to null', () => {
    const address = CustomerAddress.create({
      customerId: 'customer-id',
      serviceAreaId: 'service-area-id',
      line1: '  12 Rustaveli Avenue  ',
      line2: '   ',
      city: '  Tbilisi ',
      postalCode: '',
      notes: '  Use rear entrance. ',
    });

    expect(address.line1).toBe('12 Rustaveli Avenue');
    expect(address.line2).toBeNull();
    expect(address.city).toBe('Tbilisi');
    expect(address.postalCode).toBeNull();
    expect(address.notes).toBe('Use rear entrance.');
  });

  it('rejects blank required fields', () => {
    expect(() =>
      CustomerAddress.create({
        customerId: 'customer-id',
        serviceAreaId: 'service-area-id',
        line1: ' ',
        city: 'Tbilisi',
      }),
    ).toThrow('line1 must not be blank');
  });
});
