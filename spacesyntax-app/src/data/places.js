const GENERIC_TYPES = new Set([
  'point_of_interest', 'establishment', 'premise', 'subpremise',
  'route', 'political', 'neighborhood', 'locality', 'ward',
  'sublocality', 'sublocality_level_1', 'sublocality_level_2', 'sublocality_level_3', 'sublocality_level_4',
  'administrative_area_level_1', 'administrative_area_level_2', 'administrative_area_level_3', 'administrative_area_level_4', 'administrative_area_level_5',
  'country', 'postal_code', 'postal_code_prefix', 'postal_code_suffix',
  'street_address', 'street_number', 'floor', 'room', 'intersection',
  'natural_feature', 'colloquial_area', 'campground',
  'geocode', 'plus_code',
]);

export const POI_CATEGORY_COLORS = {
  'Food & Drink': '#e74c3c',
  'Shops & Retail': '#f39c12',
  'Health & Medical': '#2ecc71',
  'Education & Culture': '#3498db',
  'Transport & Parking': '#95a5a6',
  'Parks & Recreation': '#1abc9c',
  'Hotels & Lodging': '#9b59b6',
  'Services & Finance': '#34495e',
  'Government & Community': '#e67e22',
};

export const GROUP_MAP = {
  'Food & Drink': ['restaurant', 'cafe', 'food', 'bar', 'meal_delivery', 'meal_takeaway', 'bakery', 'night_club'],
  'Shops & Retail': ['store', 'shopping_mall', 'department_store', 'convenience_store', 'clothing_store', 'jewelry_store', 'shoe_store', 'electronics_store', 'furniture_store', 'home_goods_store', 'hardware_store', 'liquor_store', 'book_store', 'pet_store', 'bicycle_store', 'florist', 'supermarket', 'grocery_or_supermarket', 'wholesaler'],
  'Health & Medical': ['pharmacy', 'hospital', 'doctor', 'dentist', 'health', 'veterinarian', 'beauty_salon', 'hair_care', 'spa', 'gym', 'fitness_center', 'physiotherapist'],
  'Education & Culture': ['school', 'university', 'secondary_school', 'primary_school', 'college', 'library', 'museum', 'art_gallery', 'cinema', 'movie_theater'],
  'Transport & Parking': ['bus_station', 'train_station', 'transit_station', 'subway_station', 'light_rail_station', 'station', 'taxi_stand', 'parking', 'car_rental', 'car_dealer', 'car_repair', 'car_wash', 'gas_station', 'electric_vehicle_charging_station', 'airport', 'heliport', 'ferry_terminal'],
  'Parks & Recreation': ['park', 'amusement_park', 'aquarium', 'stadium', 'sports', 'sports_complex', 'tourist_attraction', 'zoo', 'casino', 'marina'],
  'Hotels & Lodging': ['lodging', 'hotel', 'hostel', 'motel', 'resort_hotel', 'bed_and_breakfast', 'campground', 'rv_park'],
  'Services & Finance': ['atm', 'bank', 'post_office', 'laundry', 'dry_cleaning', 'travel_agency', 'real_estate_agency', 'accounting', 'lawyer', 'notary', 'insurance_agency', 'electrician', 'plumber', 'roofer', 'painter', 'moving_company', 'storage', 'funeral_home', 'locksmith', 'window_construction_company'],
  'Government & Community': ['local_government_office', 'courthouse', 'city_hall', 'police', 'fire_station', 'embassy', 'place_of_worship', 'church', 'mosque', 'temple', 'hindu_temple', 'synagogue', 'cemetery', 'community_center', 'post_box', 'town_square'],
};

const CATEGORY_LABELS = {};
for (const [group, tags] of Object.entries(GROUP_MAP)) {
  for (const tag of tags) {
    CATEGORY_LABELS[tag] = group;
  }
}

function categorizePlace(types) {
  if (!types || types.length === 0) return 'Other';

  const meaningful = types.filter((t) => !GENERIC_TYPES.has(t));
  if (meaningful.length === 0) return 'Other';

  for (const type of meaningful) {
    const group = CATEGORY_LABELS[type];
    if (group) return group;
  }

  return meaningful[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchPlaces(lat, lng, radius = 800) {
  const url = `http://localhost:5000/api/places?lat=${lat}&lng=${lng}&radius=${radius}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
    const results = data.results || [];
    const categories = {};

    for (const place of results) {
      const cat = categorizePlace(place.types);
      if (cat === 'Other') {
        console.debug('[Places] Skipped (generic):', place.name, place.types);
        continue;
      }
      if (!categories[cat]) categories[cat] = { count: 0, places: [] };
      categories[cat].count++;
      categories[cat].places.push(place.name);
    }

    const total = Object.values(categories).reduce((s, c) => s + c.count, 0);
    const sorted = Object.entries(categories)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([category, data]) => ({ category, count: data.count, examples: data.places.slice(0, 3) }));

    return { total, categories: sorted, raw: results };
  }

  throw new Error(`Places API: ${data.status} — ${data.error_message || ''}`);
}
