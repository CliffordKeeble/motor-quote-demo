import type { Vehicle } from './types';

export const vehicleName = (v: Vehicle) => `${v.make} ${v.model} (${v.year})`;
