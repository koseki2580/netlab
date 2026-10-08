/**
 * The five places an exercise can be set in. Each has its own names for the
 * devices, so that an instance set in a clinic reads as a clinic and not as
 * "shop" with a word swapped. English names are bare noun phrases (see
 * `text.ts`); Japanese names are what a person there would call the device.
 */

import type { Draw } from './draw';
import { L, type Named } from './text';

export type PlaceId = 'home' | 'shop' | 'clinic' | 'school' | 'office';

export interface PlaceGroup {
  /** The group as a noun: "sales floor" / 売り場. */
  readonly name: Named;
  readonly members: readonly [Named, Named, Named];
}

export interface PlaceSite {
  /** The site as a noun: "main shop" / 本店. */
  readonly name: Named;
  readonly router: Named;
  /** A PC or a server at that site. */
  readonly device: Named;
}

export interface Place {
  readonly id: PlaceId;
  /** "the shop" as a bare noun: "shop" / お店. */
  readonly name: Named;
  /** The devices people sit at. */
  readonly pcs: readonly [Named, Named, Named];
  /** A device that has just been bought. */
  readonly newPc: Named;
  /** What the PCs need to reach, and two more devices on that side. */
  readonly server: Named;
  readonly server2: Named;
  readonly server3: Named;
  /** A shared device that gets moved from room to room. */
  readonly printer: Named;
  readonly router: Named;
  /** The switch the PCs plug into, the one on the server side, and one lying unused. */
  readonly lanSwitch: Named;
  readonly backSwitch: Named;
  readonly farSwitch: Named;
  readonly spareSwitch: Named;
  /** Two groups that share switches and must be kept apart (VLANs, ACLs). */
  readonly groups: readonly [PlaceGroup, PlaceGroup];
  /** Switches in different rooms, for loops. */
  readonly switches: readonly [Named, Named, Named, Named];
  /** Sites joined by routers: where the learner sits, a middle hop, and two far sites. */
  readonly sites: {
    readonly near: PlaceSite;
    readonly mid: { readonly router: Named };
    readonly far: PlaceSite;
    readonly far2: PlaceSite;
    readonly far3: PlaceSite;
  };
}

const HOME: Place = {
  id: 'home',
  name: L('house', '家'),
  pcs: [
    L('lounge PC', 'リビングのパソコン'),
    L('study laptop', '書斎のノートパソコン'),
    L("kids'-room PC", '子ども部屋のパソコン'),
  ],
  newPc: L('new tablet', '新しいタブレット'),
  server: L('photo server', '写真用のサーバー'),
  server2: L('printer', 'プリンタ'),
  server3: L('TV recorder', 'テレビの録画機'),
  printer: L('colour printer', 'カラープリンタ'),
  router: L('home router', '家のルータ'),
  lanSwitch: L('lounge switch', 'リビングのスイッチ'),
  backSwitch: L('upstairs switch', '2 階のスイッチ'),
  farSwitch: L('cupboard switch', '物置のスイッチ'),
  spareSwitch: L('old switch', '古いスイッチ'),
  groups: [
    {
      name: L('family', '家族'),
      members: [
        L('lounge PC', 'リビングのパソコン'),
        L('study laptop', '書斎のノートパソコン'),
        L("kids'-room PC", '子ども部屋のパソコン'),
      ],
    },
    {
      name: L('work-from-home', '在宅勤務'),
      members: [
        L('work laptop', '仕事用のノートパソコン'),
        L('work phone', '仕事用の電話機'),
        L('work printer', '仕事用のプリンタ'),
      ],
    },
  ],
  switches: [
    L('lounge switch', 'リビングのスイッチ'),
    L('upstairs switch', '2 階のスイッチ'),
    L('study switch', '書斎のスイッチ'),
    L('garage switch', 'ガレージのスイッチ'),
  ],
  sites: {
    near: {
      name: L('main house', '母屋'),
      router: L('main-house router', '母屋のルータ'),
      device: L('lounge PC', 'リビングのパソコン'),
    },
    mid: { router: L('garden router', '庭のルータ') },
    far: {
      name: L('annexe', '離れ'),
      router: L('annexe router', '離れのルータ'),
      device: L('photo server', '写真用のサーバー'),
    },
    far2: {
      name: L('garage', 'ガレージ'),
      router: L('garage router', 'ガレージのルータ'),
      device: L('garage camera', 'ガレージのカメラ'),
    },
    far3: {
      name: L('workshop', '作業小屋'),
      router: L('workshop router', '作業小屋のルータ'),
      device: L('workshop PC', '作業小屋のパソコン'),
    },
  },
};

const SHOP: Place = {
  id: 'shop',
  name: L('shop', 'お店'),
  pcs: [
    L('till', 'レジ'),
    L('office PC', '事務室のパソコン'),
    L('shop-floor tablet', '売り場のタブレット'),
  ],
  newPc: L('second till', '2 台目のレジ'),
  server: L('stock server', '在庫サーバー'),
  server2: L('receipt printer', '伝票プリンタ'),
  server3: L('camera recorder', '防犯カメラの録画機'),
  printer: L('label printer', '値札プリンタ'),
  router: L('shop router', 'お店のルータ'),
  lanSwitch: L('shop-floor switch', '売り場のスイッチ'),
  backSwitch: L('office switch', '事務室のスイッチ'),
  farSwitch: L('stockroom switch', '倉庫のスイッチ'),
  spareSwitch: L('spare switch', '予備のスイッチ'),
  groups: [
    {
      name: L('shop floor', '売り場'),
      members: [
        L('front till', '手前のレジ'),
        L('back till', '奥のレジ'),
        L('shop-floor tablet', '売り場のタブレット'),
      ],
    },
    {
      name: L('back office', '事務'),
      members: [
        L("manager's PC", '店長のパソコン'),
        L('accounts PC', '経理のパソコン'),
        L('orders PC', '発注用のパソコン'),
      ],
    },
  ],
  switches: [
    L('shop-floor switch', '売り場のスイッチ'),
    L('office switch', '事務室のスイッチ'),
    L('stockroom switch', '倉庫のスイッチ'),
    L('upstairs switch', '2 階のスイッチ'),
  ],
  sites: {
    near: {
      name: L('branch shop', '支店'),
      router: L('branch router', '支店のルータ'),
      device: L('branch till', '支店のレジ'),
    },
    mid: { router: L('relay router', '中継のルータ') },
    far: {
      name: L('main shop', '本店'),
      router: L('main-shop router', '本店のルータ'),
      device: L('stock server', '在庫サーバー'),
    },
    far2: {
      name: L('warehouse', '倉庫'),
      router: L('warehouse router', '倉庫のルータ'),
      device: L('delivery server', '配送サーバー'),
    },
    far3: {
      name: L('head office', '本部'),
      router: L('HQ router', '本部のルータ'),
      device: L('sales server', '売上サーバー'),
    },
  },
};

const CLINIC: Place = {
  id: 'clinic',
  name: L('clinic', '診療所'),
  pcs: [
    L('reception PC', '受付のパソコン'),
    L('exam-room PC', '診察室のパソコン'),
    L('billing PC', '会計のパソコン'),
  ],
  newPc: L('new nurse PC', '看護師用の新しいパソコン'),
  server: L('records server', 'カルテサーバー'),
  server2: L('scan image server', 'レントゲン画像のサーバー'),
  server3: L('booking server', '予約サーバー'),
  printer: L('script printer', '処方せんプリンタ'),
  router: L('clinic router', '診療所のルータ'),
  lanSwitch: L('reception switch', '受付のスイッチ'),
  backSwitch: L('exam-room switch', '診察室のスイッチ'),
  farSwitch: L('rack switch', 'サーバー棚のスイッチ'),
  spareSwitch: L('spare switch', '予備のスイッチ'),
  groups: [
    {
      name: L('medical staff', '診療'),
      members: [
        L('exam room 1 PC', '診察室 1 のパソコン'),
        L('exam room 2 PC', '診察室 2 のパソコン'),
        L("nurses' PC", '看護師のパソコン'),
      ],
    },
    {
      name: L('waiting room', '待合室'),
      members: [
        L("patients' tablet", '待合室のタブレット'),
        L('check-in machine', '自動受付機'),
        L("patients' screen", '待合室の案内画面'),
      ],
    },
  ],
  switches: [
    L('reception switch', '受付のスイッチ'),
    L('exam-room switch', '診察室のスイッチ'),
    L('test-room switch', '検査室のスイッチ'),
    L('upstairs switch', '2 階のスイッチ'),
  ],
  sites: {
    near: {
      name: L('branch clinic', '分院'),
      router: L('branch router', '分院のルータ'),
      device: L('branch PC', '分院の受付パソコン'),
    },
    mid: { router: L('relay router', '中継のルータ') },
    far: {
      name: L('main clinic', '本院'),
      router: L('main-site router', '本院のルータ'),
      device: L('records server', 'カルテサーバー'),
    },
    far2: {
      name: L('lab', '検査センター'),
      router: L('lab router', '検査センターのルータ'),
      device: L('lab server', '検査結果のサーバー'),
    },
    far3: {
      name: L('pharmacy', '薬局'),
      router: L('pharmacy router', '薬局のルータ'),
      device: L('pharmacy server', '処方せんのサーバー'),
    },
  },
};

const SCHOOL: Place = {
  id: 'school',
  name: L('school', '学校'),
  pcs: [
    L("teacher's PC", '先生のパソコン'),
    L('library PC', '図書室のパソコン'),
    L('classroom PC', '教室のパソコン'),
  ],
  newPc: L('new tablet', '教室の新しいタブレット'),
  server: L('materials server', '教材サーバー'),
  server2: L('staff-room printer', '職員室のプリンタ'),
  server3: L('library server', '図書サーバー'),
  printer: L('poster printer', 'ポスター用のプリンタ'),
  router: L('school router', '学校のルータ'),
  lanSwitch: L('classroom switch', '教室のスイッチ'),
  backSwitch: L('library switch', '図書室のスイッチ'),
  farSwitch: L('staff-room switch', '職員室のスイッチ'),
  spareSwitch: L('spare switch', '予備のスイッチ'),
  groups: [
    {
      name: L('teachers', '先生'),
      members: [
        L("head's PC", '校長先生のパソコン'),
        L("form tutor's PC", '担任の先生のパソコン'),
        L('school-office PC', '事務室のパソコン'),
      ],
    },
    {
      name: L('pupils', '生徒'),
      members: [
        L('red-team PC', '赤組のパソコン'),
        L('white-team PC', '白組のパソコン'),
        L('blue-team PC', '青組のパソコン'),
      ],
    },
  ],
  switches: [
    L('staff-room switch', '職員室のスイッチ'),
    L('IT-room switch', 'パソコン教室のスイッチ'),
    L('library switch', '図書室のスイッチ'),
    L('gym switch', '体育館のスイッチ'),
  ],
  sites: {
    near: {
      name: L('new block', '新校舎'),
      router: L('new-block router', '新校舎のルータ'),
      device: L('new-block PC', '新校舎のパソコン'),
    },
    mid: { router: L('corridor router', '渡り廊下のルータ') },
    far: {
      name: L('main block', '本校舎'),
      router: L('main-block router', '本校舎のルータ'),
      device: L('materials server', '教材サーバー'),
    },
    far2: {
      name: L('gym', '体育館'),
      router: L('gym router', '体育館のルータ'),
      device: L('gym camera', '体育館のカメラ'),
    },
    far3: {
      name: L('library building', '図書館'),
      router: L('library router', '図書館のルータ'),
      device: L('library server', '図書サーバー'),
    },
  },
};

const OFFICE: Place = {
  id: 'office',
  name: L('office', '会社'),
  pcs: [
    L('sales PC', '営業のパソコン'),
    L('general-affairs PC', '総務のパソコン'),
    L('meeting-room PC', '会議室のパソコン'),
  ],
  newPc: L("newcomer's PC", '新入社員のパソコン'),
  server: L('file server', 'ファイルサーバー'),
  server2: L('office printer', '複合機'),
  server3: L('timesheet server', '勤怠サーバー'),
  printer: L('plan printer', '図面用のプリンタ'),
  router: L('office router', '会社のルータ'),
  lanSwitch: L('3rd-floor switch', '3 階のスイッチ'),
  backSwitch: L('4th-floor switch', '4 階のスイッチ'),
  farSwitch: L('comms-room switch', 'サーバー室のスイッチ'),
  spareSwitch: L('spare switch', '予備のスイッチ'),
  groups: [
    {
      name: L('sales', '営業'),
      members: [
        L('sales team 1 PC', '営業 1 課のパソコン'),
        L('sales team 2 PC', '営業 2 課のパソコン'),
        L('sales team 3 PC', '営業 3 課のパソコン'),
      ],
    },
    {
      name: L('accounts', '経理'),
      members: [
        L("accounts head's PC", '経理課長のパソコン'),
        L("accounts clerk's PC", '経理担当のパソコン'),
        L('payroll PC', '給与計算のパソコン'),
      ],
    },
  ],
  switches: [
    L('3rd-floor switch', '3 階のスイッチ'),
    L('4th-floor switch', '4 階のスイッチ'),
    L('comms-room switch', 'サーバー室のスイッチ'),
    L('reception switch', '受付のスイッチ'),
  ],
  sites: {
    near: {
      name: L('branch office', '支社'),
      router: L('branch router', '支社のルータ'),
      device: L('branch-office PC', '支社のパソコン'),
    },
    mid: { router: L('relay router', '中継のルータ') },
    far: {
      name: L('head office', '本社'),
      router: L('HQ router', '本社のルータ'),
      device: L('file server', 'ファイルサーバー'),
    },
    far2: {
      name: L('datacentre', 'データセンター'),
      router: L('datacentre router', 'データセンターのルータ'),
      device: L('mail server', 'メールサーバー'),
    },
    far3: {
      name: L('factory', '工場'),
      router: L('factory router', '工場のルータ'),
      device: L('production server', '生産管理サーバー'),
    },
  },
};

export const PLACES: readonly [Place, Place, Place, Place, Place] = [
  HOME,
  SHOP,
  CLINIC,
  SCHOOL,
  OFFICE,
];

export const drawPlace = (draw: Draw): Place => draw.pick(PLACES);

/** One whole sentence per place: `scene(place, { home: ..., shop: ..., ... })`. */
export function scene<T>(place: Place, byPlace: Readonly<Record<PlaceId, T>>): T {
  return byPlace[place.id];
}
