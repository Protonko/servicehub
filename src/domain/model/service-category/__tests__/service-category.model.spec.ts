import { ServiceCategory } from '../service-category.model';

describe('ServiceCategory', () => {
  it('normalizes service category creation input', () => {
    const category = ServiceCategory.create({
      code: ' hvac ',
      name: ' HVAC ',
    });

    expect(category.code).toBe('HVAC');
    expect(category.name).toBe('HVAC');
    expect(category.description).toBeNull();
    expect(category.isActive).toBe(true);
  });

  it('updates mutable service category fields without changing identity or code', () => {
    const category = ServiceCategory.rehydrate({
      id: 'category-id',
      code: 'HVAC',
      name: 'HVAC',
      description: null,
      isActive: true,
    });

    const updatedCategory = category.update({
      name: ' HVAC Services ',
      description: 'Updated description.',
      isActive: false,
    });

    expect(updatedCategory.id).toBe('category-id');
    expect(updatedCategory.code).toBe('HVAC');
    expect(updatedCategory.name).toBe('HVAC Services');
    expect(updatedCategory.description).toBe('Updated description.');
    expect(updatedCategory.isActive).toBe(false);
  });
});
