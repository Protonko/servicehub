export interface ServiceCategoryProps {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateServiceCategoryInput {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateServiceCategoryInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}
