import { TechnicianManagementListItem } from '@application/read-models';

import { TechnicianManagementRow } from './technician-management-read.types';

export const TechnicianManagementReadMapper = {
  toListItem(row: TechnicianManagementRow): TechnicianManagementListItem {
    return {
      id: row.id,
      user: {
        id: row.userId,
        email: row.userEmail,
        fullName: row.userFullName,
      },
      status: row.status,
      dailyAssignmentLimit: row.dailyAssignmentLimit,
      rating: row.rating === null ? null : Number(row.rating),
      skills: row.skills,
      serviceAreas: row.serviceAreas,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
};
