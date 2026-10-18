export const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0));
export const dateLabel=v=>v?new Date(`${String(v).slice(0,10)}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
export const todayIso=()=>new Date().toISOString().slice(0,10);

export const getSportImage = (item) => {
  if (item?.image_url && item.image_url.trim()) return item.image_url;
  const name = String(item?.name || item?.sport_name || item?.slug || '').toLowerCase();
  if (name.includes('badminton')) return '/badminton-court.jpg';
  if (name.includes('cricket')) return '/cricket-turf.jpg';
  if (name.includes('tennis') && !name.includes('table')) return '/tennis-court.jpg';
  if (name.includes('pickleball')) return '/pickleball-court.jpg';
  if (name.includes('football') || name.includes('soccer')) return '/football-court.jpg';
  return '/cricket-turf.jpg';
};

export const getSportPrice = (item) => {
  if (item?.price && Number(item.price) > 0) return item.price;
  if (item?.base_price && Number(item.base_price) > 0) return item.base_price;
  if (item?.hourly_base_price && Number(item.hourly_base_price) > 0) return item.hourly_base_price;
  const name = String(item?.name || item?.sport_name || '').toLowerCase();
  if (name.includes('badminton')) return 500;
  if (name.includes('cricket')) return 1000;
  if (name.includes('football')) return 1400;
  if (name.includes('tennis')) return 800;
  if (name.includes('pickleball')) return 600;
  return 800;
};
