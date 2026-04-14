export const CRIME_TYPES = [
    'giet_nguoi', 'bat_coc', 'truy_na', 'cuop_giat',
    'de_doa', 'nghi_pham', 'dang_ngo', 'trom_cap',
] as const;

export type CrimeTypeKey = typeof CRIME_TYPES[number];

/** Vietnamese display label for each crime type */
export const CRIME_TYPE_LABEL: Record<CrimeTypeKey, string> = {
    giet_nguoi: 'Giết người',
    bat_coc:    'Bắt cóc',
    truy_na:    'Truy nã',
    cuop_giat:  'Cướp giật',
    de_doa:     'Đe dọa',
    nghi_pham:  'Nghi phạm',
    dang_ngo:   'Đáng ngờ',
    trom_cap:   'Trộm cắp',
};

/**
 * Single danger-weight scale (1–10).
 * Use weightToSeverity() to convert to the 1–5 DB severity column value.
 */
export const CRIME_DANGER_WEIGHT: Record<CrimeTypeKey, number> = {
    giet_nguoi: 10,
    bat_coc:    9,
    truy_na:    8,
    cuop_giat:  7,
    de_doa:     6,
    nghi_pham:  5,
    dang_ngo:   3,
    trom_cap:   3,
};

/** Convert 1–10 danger weight → 1–5 severity (for DB column) */
export function weightToSeverity(weight: number): number {
    return Math.ceil(weight / 2);
}
