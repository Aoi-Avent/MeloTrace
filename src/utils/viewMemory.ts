/** 画面を移動しても、スクロール位置や並び順・検索条件を覚えておくための、アプリ起動中だけのメモリ */
export const scrollMem = new Map<string, number>();

export interface LibraryMem {
  search: string;
  genre: string;
  sub: 'all' | 'vocaloid' | 'bgm' | 'favorites' | 'playlists';
  visible: number;
  snap: { sig: string; ids: string[] };
}
export const libraryMem: LibraryMem = { search: '', genre: 'all', sub: 'all', visible: 60, snap: { sig: '', ids: [] } };

export const searchMem = { query: '' };
