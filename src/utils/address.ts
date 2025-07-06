import { Location } from "@/types";

export const formatAddress = (loc: Location | null): string => {
  if (!loc) return "Endereço não disponível";
  
  const addressParts = [
    loc.street_name,
    loc.street_number,
  ].filter(Boolean).join(', ');

  const cityStateZip = [
    loc.city,
    loc.state,
    loc.zip_code
  ].filter(Boolean).join(' ');

  const fullAddress = [
    addressParts,
    loc.unit_number,
    cityStateZip
  ].filter(Boolean).join(' - ');

  return fullAddress || "Endereço incompleto";
};

export const generateMapsUrl = (loc: Location | null): string => {
  if (!loc) return "";
  
  const address = [
    loc.street_name,
    loc.street_number,
    loc.city,
    loc.state,
    loc.zip_code,
  ].filter(Boolean).join(' ');

  if (!address) return "";
  
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
};