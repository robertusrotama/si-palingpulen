/** Faktor aktivitas standar (spec §8.2) dengan label deskriptif. */
export const ACTIVITY = [
  [1.2, 'Jarang bergerak, tanpa latihan'], [1.375, 'Latihan 1 sampai 3 kali per minggu'], [1.55, 'Latihan 3 sampai 5 kali per minggu'],
  [1.725, 'Latihan 6 sampai 7 kali per minggu'], [1.9, 'Latihan berat setiap hari atau kerja fisik'],
] as const;
