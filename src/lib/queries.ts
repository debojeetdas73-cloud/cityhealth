import { queryOptions } from "@tanstack/react-query";
import { getDoctor, getHospital, getPackage, listDoctors, listHospitals, listPackages, listPlans, listSpecialties } from "./data";

export const specialtiesQuery = queryOptions({ queryKey: ["specialties"], queryFn: listSpecialties, staleTime: 300_000 });
export const hospitalsQuery = queryOptions({ queryKey: ["hospitals"], queryFn: () => listHospitals(), staleTime: 300_000 });
export const doctorsQuery = queryOptions({ queryKey: ["doctors"], queryFn: () => listDoctors(), staleTime: 300_000 });
export const packagesQuery = queryOptions({ queryKey: ["packages"], queryFn: () => listPackages(), staleTime: 300_000 });
export const plansQuery = queryOptions({ queryKey: ["plans"], queryFn: listPlans, staleTime: 300_000 });
export const doctorQuery = (slug: string) => queryOptions({ queryKey: ["doctor", slug], queryFn: () => getDoctor(slug) });
export const hospitalQuery = (slug: string) => queryOptions({ queryKey: ["hospital", slug], queryFn: () => getHospital(slug) });
export const packageQuery = (slug: string) => queryOptions({ queryKey: ["package", slug], queryFn: () => getPackage(slug) });