import { loadStaticSnapshot } from './staticFallback';
import { calculateShippingFee, resolveVolumeTier } from './pricing';
import { ALL_ADMIN_PERMISSIONS } from './rbac';
import { buildLiveShippingTracking } from './shippingTracking';

const STATIC_STATE_KEY = 'roar_static_runtime_v1';

interface StaticUserRecord {
  id: number;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'customer' | 'b2b_partner' | 'admin';
  adminRole?: string;
  adminPermissions?: string[];
  memberCode: string;
  tier: string;
  emailVerified: boolean;
  companyName?: string;
  b2bVerified?: boolean;
  walletBalance?: number;
  points?: number;
  createdAt: string;
}

interface StaticRuntimeState {
  users: StaticUserRecord[];
  orders: any[];
  b2bInquiries: any[];
  newsletterSubscribers: Array<{ id: number; email: string; lang: string; created_at: string }>;
  settingsOverlay: Record<string, string>;
  productsOverlay: Record<number, any>;
  createdProducts: any[];
  walletTransactions: any[];
  checkins: Record<number, { streak: number; lastCheckinDate: string; history: any[] }>;
}

function getDefaultUsers(): StaticUserRecord[] {
  return [
    {
      id: 1,
      email: 'admin@roarcoffee.vn',
      password: 'RoarAdmin2026!',
      fullName: 'ROAR Super Admin',
      phone: '0901234567',
      role: 'admin',
      adminRole: 'super_admin',
      adminPermissions: [...ALL_ADMIN_PERMISSIONS],
      memberCode: 'RC-ADM-000001',
      tier: 'ROAR Reserve',
      emailVerified: true,
      createdAt: '2026-01-01 08:00:00',
    },
    {
      id: 2,
      email: 'customer@roarcoffee.vn',
      password: 'RoarMember2026!',
      fullName: 'Nguyễn Minh Quân',
      phone: '0912345678',
      role: 'customer',
      memberCode: 'RC-MEM-100001',
      tier: 'ROAR Member',
      emailVerified: true,
      createdAt: '2026-02-01 09:00:00',
    },
  ];
}

function getDefaultOrders(): any[] {
  return [
    {
      id: 9001,
      order_number: 'RC-20261114-1892',
      user_id: 2,
      customer_name: 'Nguyễn Minh Khôi',
      customer_email: 'member@roarcoffee.vn',
      customer_phone: '0909 123 456',
      shipping_address: '12 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      currency: 'VND',
      subtotal: 440000,
      discount_amount: 0,
      points_redeemed: 0,
      points_discount: 0,
      shipping_fee: 0,
      total: 440000,
      voucher_code: '',
      payment_method: 'momo',
      payment_status: 'paid',
      order_status: 'Shipping',
      tracking_code: 'GHN-ROAR-884210',
      notes: 'Đã đóng gói chống sốc',
      created_at: '2026-11-18 09:15:00',
      updated_at: '2026-11-20 10:30:00',
      items: [
        {
          id: 1,
          sku: 'RC-ESG-500',
          product_name_vi: 'ROAR Espresso Gold (Đại Bàng)',
          product_name_en: 'ROAR Espresso Gold (Eagle)',
          variant_label: '500g · Whole Bean (Gold)',
          quantity: 1,
          unit_price_vnd: 440000,
          line_total_vnd: 440000,
        },
      ],
    },
    {
      id: 9002,
      order_number: 'RC-20261115-2048',
      user_id: 2,
      customer_name: 'Nguyễn Minh Khôi',
      customer_email: 'member@roarcoffee.vn',
      customer_phone: '0909 123 456',
      shipping_address: '45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      currency: 'VND',
      subtotal: 390000,
      discount_amount: 50000,
      points_redeemed: 0,
      points_discount: 0,
      shipping_fee: 35000,
      total: 375000,
      voucher_code: 'ROARESPRESSO50',
      payment_method: 'vietqr',
      payment_status: 'pending_verification',
      order_status: 'Pending',
      tracking_code: '',
      notes: 'Giao giờ hành chính.',
      created_at: '2026-11-20 08:40:00',
      updated_at: '2026-11-20 08:40:00',
      items: [
        {
          id: 2,
          sku: 'RC-ESP-250',
          product_name_vi: 'ROAR Espresso (Cáo)',
          product_name_en: 'ROAR Espresso (Fox)',
          variant_label: '250g · Whole Bean',
          quantity: 2,
          unit_price_vnd: 195000,
          line_total_vnd: 390000,
        },
      ],
    },
    {
      id: 9003,
      order_number: 'RC-20261101-1001',
      user_id: 2,
      customer_name: 'Nguyễn Minh Khôi',
      customer_email: 'member@roarcoffee.vn',
      customer_phone: '0909 123 456',
      shipping_address: '12 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      currency: 'VND',
      subtotal: 490000,
      discount_amount: 0,
      points_redeemed: 0,
      points_discount: 0,
      shipping_fee: 0,
      total: 490000,
      voucher_code: '',
      payment_method: 'bank_transfer',
      payment_status: 'confirmed_demo',
      order_status: 'Completed',
      tracking_code: 'VN-DEMO-1001',
      notes: '',
      created_at: '2026-11-01 10:00:00',
      updated_at: '2026-11-03 14:20:00',
      items: [
        {
          id: 3,
          sku: 'RC-RES-250',
          product_name_vi: 'ROAR Signature Reserve (Báo Đen)',
          product_name_en: 'ROAR Signature Reserve (Black Panther)',
          variant_label: '250g · Signature Tin (Whole Bean)',
          quantity: 1,
          unit_price_vnd: 490000,
          line_total_vnd: 490000,
        },
      ],
    },
  ];
}

function readState(): StaticRuntimeState {
  try {
    const raw = window.localStorage.getItem(STATIC_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : getDefaultUsers(),
        orders: Array.isArray(parsed.orders) && parsed.orders.length > 0 ? parsed.orders : getDefaultOrders(),
        b2bInquiries: Array.isArray(parsed.b2bInquiries) ? parsed.b2bInquiries : [],
        newsletterSubscribers: Array.isArray(parsed.newsletterSubscribers) ? parsed.newsletterSubscribers : [],
        settingsOverlay: parsed.settingsOverlay || {},
        productsOverlay: parsed.productsOverlay || {},
        createdProducts: Array.isArray(parsed.createdProducts) ? parsed.createdProducts : [],
        walletTransactions: Array.isArray(parsed.walletTransactions) ? parsed.walletTransactions : [],
        checkins: parsed.checkins && typeof parsed.checkins === 'object' ? parsed.checkins : {},
      };
    }
  } catch {
    // ignore
  }
  return {
    users: getDefaultUsers(),
    orders: getDefaultOrders(),
    b2bInquiries: [],
    newsletterSubscribers: [],
    settingsOverlay: {},
    productsOverlay: {},
    createdProducts: [],
    walletTransactions: [],
    checkins: {},
  };
}

function writeState(state: StaticRuntimeState): void {
  try {
    window.localStorage.setItem(STATIC_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function toPublicUser(u: StaticUserRecord) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    adminRole: u.adminRole,
    adminPermissions: u.adminPermissions,
    memberCode: u.memberCode,
    tier: u.tier,
    emailVerified: u.emailVerified,
    companyName: u.companyName || '',
    b2bVerified: Boolean(u.b2bVerified),
    addresses: [],
    walletBalance: u.walletBalance ?? 0,
    points: { available: u.points ?? 120, pending: 0, redeemed: 0, expired: 0, expiringSoon: 0 },
    unreadNotifications: 0,
  };
}

function resolveTokenUser(headers: Headers, state: StaticRuntimeState): StaticUserRecord | null {
  const auth = headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim() || window.localStorage.getItem('roar_auth_token') || '';
  if (!token.startsWith('static-token-')) return null;
  const uid = Number(token.replace('static-token-', ''));
  return state.users.find((u) => u.id === uid) || null;
}

export async function handleStaticApiFallback(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response | null> {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : input.url;
  let pathname = urlStr;
  let searchParams = new URLSearchParams();
  try {
    const u = new URL(urlStr, window.location.origin);
    pathname = u.pathname;
    searchParams = u.searchParams;
  } catch {
    // fallback
  }

  if (!pathname.startsWith('/api/')) return null;

  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers || {});
  let body: any = {};
  if (typeof init.body === 'string' && init.body.trim()) {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = {};
    }
  }

  const state = readState();
  const snap = await loadStaticSnapshot();

  // 1. Auth: Register
  if (pathname === '/api/auth/register' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const phone = String(body.phone || '').trim();
    if (!email || !password || !fullName) {
      return jsonResponse({ error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.' }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'Mật khẩu cần tối thiểu 6 ký tự.' }, 400);
    }
    if (state.users.some((u) => u.email.toLowerCase() === email)) {
      return jsonResponse({ error: 'Email này đã được đăng ký tài khoản.' }, 409);
    }
    const role = body.roleIntent === 'b2b_partner' ? 'b2b_partner' : 'customer';
    const nextId = Math.max(10, ...state.users.map((u) => u.id)) + 1;
    const newUser: StaticUserRecord = {
      id: nextId,
      email,
      password,
      fullName,
      phone,
      role,
      memberCode: `RC-${role === 'b2b_partner' ? 'B2B' : 'MEM'}-${Math.floor(100000 + Math.random() * 900000)}`,
      tier: 'ROAR Member',
      emailVerified: true,
      companyName: String(body.companyName || '').trim(),
      b2bVerified: false,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    state.users.push(newUser);
    writeState(state);
    return jsonResponse({ ok: true, user: toPublicUser(newUser), token: `static-token-${newUser.id}` }, 201);
  }

  // 2. Auth: Login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    let found = state.users.find((u) => u.email.toLowerCase() === email && u.password === password);
    // Also accept backend default credentials on static hosts (even if localStorage had older defaults)
    if (!found && email === 'admin@roarcoffee.vn' && (password === 'Admin@Roar2026!' || password === 'RoarAdmin2026!')) {
      found = state.users.find((u) => u.email.toLowerCase() === 'admin@roarcoffee.vn');
    }
    if (!found && email === 'member@roarcoffee.vn' && (password === 'Member@Roar2026!' || password === 'RoarMember2026!')) {
      found = state.users.find((u) => u.email.toLowerCase() === 'member@roarcoffee.vn');
      if (!found) {
        found = {
          id: 3,
          email: 'member@roarcoffee.vn',
          password: 'Member@Roar2026!',
          fullName: 'Nguyễn Minh Khôi',
          phone: '0912345678',
          role: 'customer',
          memberCode: 'RC-MEM-1001',
          tier: 'ROAR Bạc',
          emailVerified: true,
          walletBalance: 500000,
          points: 120,
          createdAt: '2026-02-01 09:00:00',
        };
        state.users.push(found);
        writeState(state);
      }
    }
    if (!found && email === 'editor@roarcoffee.vn' && password === 'Editor@Roar2026!') {
      found = state.users.find((u) => u.email.toLowerCase() === 'editor@roarcoffee.vn');
      if (!found) {
        found = {
          id: 4,
          email: 'editor@roarcoffee.vn',
          password: 'Editor@Roar2026!',
          fullName: 'Trần Thảo Vy (Biên tập CMS)',
          phone: '0909888777',
          role: 'admin',
          adminRole: 'editor',
          adminPermissions: [...ALL_ADMIN_PERMISSIONS],
          memberCode: 'RC-ADM-0002',
          tier: 'ROAR Vàng',
          emailVerified: true,
          createdAt: '2026-01-15 09:00:00',
        };
        state.users.push(found);
        writeState(state);
      }
    }
    if (!found) {
      return jsonResponse({ error: 'Sai email hoặc mật khẩu.' }, 401);
    }
    return jsonResponse({ ok: true, user: toPublicUser(found), token: `static-token-${found.id}` });
  }

  // 2b. Auth: Social (Google / Facebook)
  if (pathname === '/api/auth/social' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim() || (email ? email.split('@')[0] : 'ROAR Member');
    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'Vui lòng cung cấp email tài khoản hợp lệ.' }, 400);
    }
    let found = state.users.find((u) => u.email.toLowerCase() === email);
    if (!found) {
      const nextId = Math.max(10, ...state.users.map((u) => u.id)) + 1;
      found = {
        id: nextId,
        email,
        password: `social-${Date.now()}`,
        fullName,
        phone: '',
        role: 'customer',
        memberCode: `RC-MEM-${Math.floor(100000 + Math.random() * 900000)}`,
        tier: 'ROAR Member',
        emailVerified: true,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      state.users.push(found);
      writeState(state);
    }
    return jsonResponse({ ok: true, user: toPublicUser(found), token: `static-token-${found.id}` });
  }

  // 2c. AI Barista Chat (Smart catalog-aware advisor on static hosting)
  if (pathname === '/api/ai/chat' && method === 'POST') {
    const q = String(body.message || '').toLowerCase();
    const isEn = body.lang === 'en';
    const kgMatch = q.match(/(\d+)\s*kg/);
    const requestedKg = kgMatch ? Math.max(1, Number(kgMatch[1])) : null;
    const allProds = (snap?.tables?.products || []).filter((p: any) => p.status !== 'draft');

    const hydrate = (p: any) => ({
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      sub_category: p.sub_category || '',
      category: p.category,
      name_vi: p.name_vi,
      name_en: p.name_en,
      price_vnd: p.price_vnd,
      price_usd: p.price_usd,
      image_key: p.image_key,
      tasting_notes_vi: p.tasting_notes_vi || '',
      tasting_notes_en: p.tasting_notes_en || '',
      pricing_tiers: Array.isArray(p.pricing_tiers) ? p.pricing_tiers : JSON.parse(p.pricing_tiers_json || '[]'),
      variants: Array.isArray(p.variants) ? p.variants : JSON.parse(p.variants_json || '[]'),
      to: `/product/${p.slug}`,
    });

    let matched = allProds.filter((p: any) => p.category !== 'green_bean');
    let quickLinks: Array<{ label: string; to: string }> = [];
    let reply = '';

    if (q.includes('kg') || q.includes('sỉ') || q.includes('hạt rang') || q.includes('s18') || q.includes('báo giá') || q.includes('wholesale')) {
      const beans = allProds.filter((p: any) => p.category === 'roasted_beans');
      matched = beans.filter((p: any) => {
        if (q.includes('arabica')) return p.name_vi.toLowerCase().includes('arabica');
        if (q.includes('culi')) return p.name_vi.toLowerCase().includes('culi');
        if (q.includes('honey')) return p.name_vi.toLowerCase().includes('honey');
        if (q.includes('cbu')) return p.name_vi.toLowerCase().includes('cbu');
        if (q.includes('robusta')) return p.name_vi.toLowerCase().includes('robusta');
        return true;
      });
      if (matched.length === 0) matched = beans;
      const top = matched.slice(0, 3);
      if (requestedKg) {
        const lines = top
          .map((p: any) => {
            const tiers = Array.isArray(p.pricing_tiers) ? p.pricing_tiers : JSON.parse(p.pricing_tiers_json || '[]');
            const tier = resolveVolumeTier(tiers, requestedKg);
            const unitP = tier ? tier.priceVnd : p.price_vnd;
            return `• ${p.name_vi} (${p.sub_category}): ${unitP.toLocaleString('vi-VN')} ₫/kg → ${requestedKg} kg = ${(unitP * requestedKg).toLocaleString('vi-VN')} ₫`;
          })
          .join('\n');
        reply = isEn
          ? `Instant quote for ${requestedKg} kg of ROAR Roasted Coffee Beans:\n${lines}`
          : `Báo giá nhanh cho ${requestedKg} kg Cà phê Hạt rang ROAR:\n${lines}`;
      } else {
        reply = isEn
          ? 'ROAR Roasted Coffee Beans feature 6 S18 SKUs with 5 automatic kg tiers (1kg, 5–19kg, 20–49kg, 50–99kg, Wholesale ≥100kg from 180,000 VND/kg). Pick a product below:'
          : 'Danh mục Cà phê Hạt rang ROAR gồm 6 mã S18 với 5 mức giá tự động theo kg (1kg, 5–19kg, 20–49kg, 50–99kg, Sỉ ≥100kg từ 180.000 ₫/kg). Bạn bấm chọn sản phẩm bên dưới nhé:';
      }
      quickLinks = [{ label: isEn ? 'All Roasted Beans (kg)' : 'Xem tất cả Cà phê Hạt rang (kg)', to: '/coffee/roasted-beans' }];
    } else if (q.includes('phin') || q.includes('đậm') || q.includes('mạnh') || q.includes('sữa đá') || q.includes('robusta')) {
      matched = allProds.filter((p: any) => p.slug.includes('lion') || p.slug.includes('tiger') || p.slug.includes('robusta')).slice(0, 3);
      reply = isEn
        ? 'For bold Vietnamese Phin or iced milk coffee, try Lion (Sư Tử), Tiger (Hổ), or Robusta S18 below:'
        : 'Với gu đậm đà pha Phin hoặc cà phê sữa đá, mình gợi ý Sư Tử (Lion), Hổ (Tiger) hoặc Robusta S18 bên dưới nhé:';
      quickLinks = [{ label: isEn ? 'Brewing Guide' : 'Hướng dẫn pha Phin chuẩn', to: '/brewing' }];
    } else if (q.includes('espresso') || q.includes('arabica') || q.includes('chua thanh') || q.includes('nhẹ') || q.includes('quà') || q.includes('signature')) {
      matched = allProds
        .filter((p: any) => p.slug.includes('signature') || p.slug.includes('fox') || p.slug.includes('eagle') || p.slug.includes('arabica'))
        .slice(0, 3);
      reply = isEn
        ? 'For smooth Espresso, aromatic Arabica, or executive gifting, explore Black Panther Signature Reserve, Fox Espresso, or Arabica S18 CBU:'
        : 'Với gu Espresso hậu ngọt, thơm thanh hoặc làm quà biếu, bạn xem Báo Đen Signature Reserve, Cáo Espresso hoặc Arabica S18 CBU bên dưới nhé:';
      quickLinks = [{ label: isEn ? '7 Brand Personalities' : 'Khám phá 7 Cá tính ROAR', to: '/personalities' }];
    } else {
      matched = allProds.filter((p: any) => p.category === 'roasted' || p.category === 'roasted_beans').slice(0, 3);
      reply = isEn
        ? 'Welcome to ROAR COFFEE® AI Barista! Tell me your taste preference (bold Phin, smooth Espresso, kg wholesale quote, or B2B green beans) and I will recommend the best products!'
        : 'Chào bạn đến với ROAR COFFEE® AI Barista! Hãy cho mình biết gu uống (đậm đà pha Phin, thơm mượt Espresso, báo giá hạt rang theo kg hay nhân xanh B2B) để mình gợi ý sản phẩm & báo giá chính xác nhé!';
      quickLinks = [
        { label: isEn ? 'Roasted Beans (5-tier kg)' : 'Cà phê Hạt rang (5 mức kg)', to: '/coffee/roasted-beans' },
        { label: isEn ? 'Vouchers & Promos' : 'Xem Voucher ưu đãi', to: '/promotions' },
      ];
    }

    return jsonResponse({
      ok: true,
      reply,
      recommendedProducts: matched.slice(0, 3).map(hydrate),
      quickLinks,
      fallback: true,
    });
  }

  // 3. Auth: Me & Logout
  if (pathname === '/api/auth/me' && method === 'GET') {
    const u = resolveTokenUser(headers, state);
    return jsonResponse({ user: u ? toPublicUser(u) : null });
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    return jsonResponse({ ok: true });
  }

  // 4. Account Dashboard
  if (pathname === '/api/account/dashboard' && method === 'GET') {
    const u = resolveTokenUser(headers, state);
    if (!u) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userOrders = state.orders.filter(
      (o) => o.user_id === u.id || String(o.customer_email || '').toLowerCase() === u.email.toLowerCase()
    );
    return jsonResponse({
      user: {
        id: u.id,
        email: u.email,
        full_name: u.fullName,
        phone: u.phone,
        role: u.role,
        member_code: u.memberCode,
        tier: u.tier,
        email_verified: 1,
        addresses: [],
      },
      points: { available: 120, pending: 0, redeemed: 0, expired: 0, expiringSoon: 0 },
      ledger: [],
      orders: userOrders,
      activeVouchers: (snap?.tables?.promotions || []).filter((p: any) => p.active),
      tiers: snap?.tables?.membership_tiers || [],
      loyaltySettings: (snap?.tables?.loyalty_settings || [])[0] || null,
      notifications: [],
    });
  }

  // 5. Promotions Validate
  if (pathname === '/api/promotions/validate' && method === 'POST') {
    const code = String(body.code || '').trim().toUpperCase();
    const sub = Number(body.subtotal || 0);
    const promos = snap?.tables?.promotions || [];
    const promo = promos.find((p: any) => String(p.code || '').toUpperCase() === code && p.active);
    if (!promo) return jsonResponse({ error: 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn.' }, 404);
    if (sub < Number(promo.min_order_value || 0)) {
      return jsonResponse({ error: `Đơn hàng tối thiểu ${Number(promo.min_order_value).toLocaleString('vi-VN')} ₫.` }, 400);
    }
    let discountAmount = 0;
    if (promo.discount_type === 'percent') {
      discountAmount = Math.round((sub * promo.discount_value) / 100);
      if (promo.max_discount > 0) discountAmount = Math.min(discountAmount, promo.max_discount);
    } else if (promo.discount_type === 'fixed') {
      discountAmount = Math.min(sub, promo.discount_value);
    } else if (promo.discount_type === 'free_shipping') {
      discountAmount = promo.discount_value || 35000;
    }
    return jsonResponse({ valid: true, promo, discountAmount });
  }

  // 6. Create Order & Track Order
  if (pathname === '/api/orders' && method === 'POST') {
    const allProds = [...(snap?.tables?.products || []), ...state.createdProducts];
    let subtotal = 0;
    const resolvedItems: any[] = [];
    for (const item of body.items || []) {
      const p = allProds.find((x: any) => x.id === Number(item.productId));
      if (!p) continue;
      const qty = Math.max(1, Number(item.quantity || 1));
      const tiers = Array.isArray(p.pricing_tiers) ? p.pricing_tiers : JSON.parse(p.pricing_tiers_json || '[]');
      let unitPriceVnd = Number(p.price_vnd || 0);
      let variantLabel = String(item.variantLabel || 'Standard');
      let unit: 'kg' | 'unit' = 'unit';
      if (tiers.length > 0) {
        const tier = resolveVolumeTier(tiers, qty);
        if (tier) {
          unitPriceVnd = tier.priceVnd;
          variantLabel = `${qty} kg (${tier.labelVi})`;
          unit = 'kg';
        }
      }
      const lineTotalVnd = unitPriceVnd * qty;
      subtotal += lineTotalVnd;
      resolvedItems.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        product_id: p.id,
        sku: p.sku,
        product_name_vi: p.name_vi,
        product_name_en: p.name_en,
        product_image_key: p.image_key,
        variant_label: variantLabel,
        quantity: qty,
        unit,
        unit_price_vnd: unitPriceVnd,
        line_total_vnd: lineTotalVnd,
      });
    }
    const mergedSettings: Record<string, string> = {};
    for (const row of snap?.tables?.site_settings || []) mergedSettings[row.key] = row.value;
    Object.assign(mergedSettings, state.settingsOverlay);
    const shippingCalc = calculateShippingFee(subtotal, mergedSettings);
    const shippingFee = shippingCalc.feeVnd;
    const total = subtotal + shippingFee;
    const orderNumber = `RC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const u = resolveTokenUser(headers, state);
    const newOrder = {
      id: Date.now(),
      order_number: orderNumber,
      user_id: u?.id || null,
      customer_name: body.customerName,
      customer_email: String(body.customerEmail || '').trim().toLowerCase(),
      customer_phone: body.customerPhone,
      shipping_address: body.shippingAddress,
      currency: body.currency || 'VND',
      subtotal,
      discount_amount: 0,
      points_discount: 0,
      shipping_fee: shippingFee,
      total,
      payment_method: body.paymentMethod || 'vietqr',
      payment_status: 'awaiting_payment',
      order_status: 'Pending',
      notes: body.notes || '',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      items: resolvedItems,
    };
    state.orders.unshift(newOrder);
    writeState(state);
    return jsonResponse({
      ok: true,
      order: {
        orderId: newOrder.id,
        orderNumber,
        total,
        subtotal,
        shippingFee,
        paymentMethod: newOrder.payment_method,
        customerEmail: newOrder.customer_email,
      },
    }, 201);
  }

  if (pathname === '/api/orders/shipping-status' && method === 'GET') {
    const orderId = (searchParams.get('orderId') || searchParams.get('orderNumber') || '').trim().toUpperCase();
    const email = (searchParams.get('email') || '').trim().toLowerCase();
    if (!orderId || !email) {
      return jsonResponse({ error: 'Vui lòng nhập đầy đủ Mã đơn hàng (Order ID) và Email đặt hàng.' }, 400);
    }
    const matched = state.orders.find(
      (o) =>
        String(o.order_number || '').trim().toUpperCase() === orderId &&
        String(o.customer_email || '').trim().toLowerCase() === email
    );
    if (!matched) {
      return jsonResponse({ error: 'Không tìm thấy đơn hàng khớp với Mã đơn hàng và Email đã nhập.' }, 404);
    }
    const shipping = buildLiveShippingTracking(matched);
    return jsonResponse({
      ok: true,
      shipping,
      order: { ...matched, shipping_tracking: shipping },
    });
  }

  if (pathname === '/api/orders/track' && method === 'GET') {
    const orderNumber = (searchParams.get('orderNumber') || '').trim().toUpperCase();
    const phone = (searchParams.get('phone') || '').replace(/\D/g, '').replace(/^84/, '0');
    const email = (searchParams.get('email') || '').trim().toLowerCase();
    const matches = state.orders.filter((o) => {
      if (orderNumber && email) {
        return (
          String(o.order_number || '').trim().toUpperCase() === orderNumber &&
          String(o.customer_email || '').trim().toLowerCase() === email
        );
      }
      if (orderNumber && String(o.order_number || '').trim().toUpperCase() === orderNumber) return true;
      if (email && String(o.customer_email || '').trim().toLowerCase() === email) return true;
      if (phone) {
        const op = String(o.customer_phone || '').replace(/\D/g, '').replace(/^84/, '0');
        if (op === phone) return true;
      }
      return false;
    });
    if (matches.length === 0) return jsonResponse({ error: 'Không tìm thấy đơn hàng phù hợp.' }, 404);
    const enriched = matches.map((o) => ({
      ...o,
      shipping_tracking: buildLiveShippingTracking(o),
    }));
    return jsonResponse({ orders: enriched, order: enriched[0] });
  }

  // 7. B2B & Newsletter Public Submissions
  if (pathname === '/api/b2b/inquiries' && method === 'POST') {
    const rec = {
      id: Date.now(),
      inquiry_type: body.inquiryType || 'wholesale',
      company_name: body.companyName || '',
      contact_name: body.contactName || '',
      email: body.email || '',
      phone: body.phone || '',
      country: body.country || 'Vietnam',
      product_sku: body.productSku || '',
      estimated_volume: body.estimatedVolume || '',
      message: body.message || '',
      status: 'new',
      quoted_price: '',
      admin_notes: '',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    state.b2bInquiries.unshift(rec);
    writeState(state);
    return jsonResponse({ ok: true, id: rec.id }, 201);
  }

  if (pathname === '/api/newsletter' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return jsonResponse({ error: 'Email không hợp lệ.' }, 400);
    if (!state.newsletterSubscribers.some((n) => n.email === email)) {
      state.newsletterSubscribers.unshift({
        id: Date.now(),
        email,
        lang: body.lang === 'en' ? 'en' : 'vi',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
      writeState(state);
    }
    return jsonResponse({ ok: true });
  }

  // 8. Admin CMS Static Fallback Endpoints
  if (pathname.startsWith('/api/admin/')) {
    const u = resolveTokenUser(headers, state);
    if (!u || u.role !== 'admin') return jsonResponse({ error: 'Admin access required' }, 403);

    if (pathname === '/api/admin/overview') {
      const products = snap?.tables?.products || [];
      const articles = snap?.tables?.journal_articles || [];
      const revenue = state.orders.reduce((s, o) => s + Number(o.total || 0), 0);
      const totalOrders = state.orders.length;
      const avgOrderValue = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;
      const members = state.users.filter((x) => x.role !== 'admin').length;
      const pointsIssued = state.users.reduce((s, x) => s + Number(x.points || 0), 0);
      return jsonResponse({
        metrics: {
          revenue,
          avgOrderValue,
          totalOrders,
          grossRevenueVnd: revenue,
          members,
          customers: members,
          pointsIssued,
          products: products.length,
          articles: articles.length,
          b2bInquiries: state.b2bInquiries.length,
          newsletterCount: state.newsletterSubscribers.length,
          activeProducts: products.filter((p: any) => p.status !== 'draft').length,
        },
        revenueByCategory: [],
        recentOrders: state.orders.slice(0, 5),
        topProducts: [],
      });
    }
    if (pathname === '/api/admin/products' && method === 'GET') {
      const list = [...(snap?.tables?.products || []), ...state.createdProducts].map((p: any) => ({
        ...p,
        ...(state.productsOverlay[p.id] || {}),
        variants: Array.isArray(p.variants) ? p.variants : JSON.parse(p.variants_json || '[]'),
        pricing_tiers: Array.isArray(p.pricing_tiers) ? p.pricing_tiers : JSON.parse(p.pricing_tiers_json || '[]'),
        gallery_images: Array.isArray(p.gallery_images) ? p.gallery_images : JSON.parse(p.gallery_images_json || '[]'),
      }));
      return jsonResponse({ products: list });
    }
    if (pathname === '/api/admin/orders' && method === 'GET') {
      return jsonResponse({ orders: state.orders });
    }
    if (pathname === '/api/admin/customers' && method === 'GET') {
      return jsonResponse({
        customers: state.users.map((x) => {
          const userOrders = state.orders.filter(
            (o) => Number(o.user_id) === x.id || String(o.customer_email || '').toLowerCase() === x.email.toLowerCase()
          );
          const totalSpent = userOrders.reduce((s, o) => s + Number(o.total || 0), 0);
          return {
            id: x.id,
            email: x.email,
            full_name: x.fullName,
            phone: x.phone,
            role: x.role,
            member_code: x.memberCode,
            tier: x.tier,
            wallet_balance_vnd: x.walletBalance ?? 0,
            orderCount: userOrders.length,
            totalSpent,
            unreadNotifications: 0,
            points: {
              available: x.points ?? 120,
              pending: 0,
              redeemed: 0,
            },
            created_at: x.createdAt,
          };
        }),
        loyaltySettings: (snap?.tables?.loyalty_settings || [])[0] || {
          points_per_10k_vnd: 1,
          vnd_per_point: 1000,
          policy_status: 'proposed_configurable',
        },
      });
    }
    if (pathname === '/api/admin/b2b' && method === 'GET') {
      return jsonResponse({ inquiries: state.b2bInquiries });
    }
    if (pathname.startsWith('/api/admin/b2b/') && method === 'PATCH') {
      const id = Number(pathname.split('/').pop());
      state.b2bInquiries = state.b2bInquiries.map((inq) =>
        inq.id === id
          ? {
              ...inq,
              status: body.status ?? inq.status,
              quoted_price: body.quotedPrice ?? inq.quoted_price,
              admin_notes: body.adminNotes ?? inq.admin_notes,
            }
          : inq
      );
      writeState(state);
      return jsonResponse({ ok: true });
    }
    if (pathname.startsWith('/api/admin/b2b/') && method === 'DELETE') {
      const id = Number(pathname.split('/').pop());
      state.b2bInquiries = state.b2bInquiries.filter((inq) => inq.id !== id);
      writeState(state);
      return jsonResponse({ ok: true });
    }
    if (pathname === '/api/admin/newsletter' && method === 'GET') {
      return jsonResponse({ subscribers: state.newsletterSubscribers });
    }
    if (pathname.startsWith('/api/admin/newsletter/') && method === 'DELETE') {
      const id = Number(pathname.split('/').pop());
      state.newsletterSubscribers = state.newsletterSubscribers.filter((n) => n.id !== id);
      writeState(state);
      return jsonResponse({ ok: true });
    }
    if (pathname === '/api/admin/promotions' && method === 'GET') {
      return jsonResponse({ promotions: snap?.tables?.promotions || [] });
    }
    if (pathname === '/api/admin/settings' && method === 'GET') {
      const settings: Record<string, string> = {};
      for (const row of snap?.tables?.site_settings || []) settings[row.key] = row.value;
      return jsonResponse({ settings: { ...settings, ...state.settingsOverlay } });
    }
    if (pathname === '/api/admin/settings' && method === 'PATCH') {
      Object.assign(state.settingsOverlay, body.settings || {});
      writeState(state);
      return jsonResponse({ ok: true });
    }
    if (pathname === '/api/admin/pages' && method === 'GET') {
      return jsonResponse({ pages: snap?.tables?.cms_pages || [] });
    }
    if (pathname === '/api/admin/journal' && method === 'GET') {
      return jsonResponse({ articles: snap?.tables?.journal_articles || [] });
    }
    if (pathname === '/api/admin/media' && method === 'GET') {
      return jsonResponse({ assets: snap?.tables?.media_assets || [] });
    }
    if (pathname === '/api/admin/team' && method === 'GET') {
      const admins = state.users
        .filter((x) => x.role === 'admin')
        .map((x) => {
          const roleKey = x.adminRole || 'super_admin';
          const perms =
            roleKey === 'super_admin'
              ? [...ALL_ADMIN_PERMISSIONS]
              : Array.isArray(x.adminPermissions)
                ? x.adminPermissions
                : ['overview'];
          return {
            id: x.id,
            email: x.email,
            fullName: x.fullName,
            phone: x.phone || '',
            role: x.role,
            adminRole: roleKey,
            adminPermissions: perms,
            memberCode: x.memberCode,
            tier: x.tier || 'ROAR Gold',
            createdAt: x.createdAt,
          };
        });
      const nonAdmins = state.users
        .filter((x) => x.role !== 'admin')
        .map((x) => ({
          id: x.id,
          email: x.email,
          full_name: x.fullName,
          phone: x.phone || '',
          role: x.role,
          member_code: x.memberCode,
        }));
      return jsonResponse({ admins, nonAdmins, auditLogs: [] });
    }
    if (pathname === '/api/admin/team' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const adminRole = String(body.adminRole || 'content_editor');
      const permissions =
        adminRole === 'super_admin'
          ? [...ALL_ADMIN_PERMISSIONS]
          : Array.isArray(body.permissions)
            ? body.permissions
            : ['overview'];

      const existingById =
        body.mode === 'promote' && body.existingUserId
          ? state.users.find((x) => x.id === Number(body.existingUserId))
          : undefined;
      const existingByEmail = email
        ? state.users.find((x) => x.email.toLowerCase() === email)
        : undefined;
      const existing = existingById || existingByEmail;

      if (existing) {
        existing.role = 'admin';
        existing.adminRole = adminRole;
        existing.adminPermissions = permissions;
        existing.emailVerified = true;
        writeState(state);
        return jsonResponse({ ok: true, id: existing.id, promoted: true });
      }

      const fullName = String(body.fullName || '').trim();
      const password = String(body.password || '');
      const phone = String(body.phone || '').trim();
      if (!email || !fullName || password.length < 6) {
        return jsonResponse({ error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu (≥6 ký tự).' }, 400);
      }
      const nextId = Math.max(10, ...state.users.map((x) => x.id)) + 1;
      const newStaff: StaticUserRecord = {
        id: nextId,
        email,
        password,
        fullName,
        phone,
        role: 'admin',
        adminRole,
        adminPermissions: permissions,
        memberCode: `RC-ADM-${String(nextId).padStart(4, '0')}`,
        tier: 'ROAR Reserve',
        emailVerified: true,
        walletBalance: 0,
        points: 0,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      state.users.push(newStaff);
      writeState(state);
      return jsonResponse({ ok: true, id: newStaff.id, promoted: false }, 201);
    }
    if (pathname.startsWith('/api/admin/team/') && method === 'PATCH') {
      const id = Number(pathname.split('/').pop());
      const target = state.users.find((x) => x.id === id);
      if (!target) return jsonResponse({ error: 'Không tìm thấy nhân sự.' }, 404);
      const superAdmins = state.users.filter((x) => x.role === 'admin' && (x.adminRole || 'super_admin') === 'super_admin');
      if (body.revokeAdmin) {
        if (target.id === u.id) {
          return jsonResponse({ error: 'Không thể tự thu hồi quyền quản trị của chính tài khoản đang đăng nhập.' }, 400);
        }
        if ((target.adminRole || 'super_admin') === 'super_admin' && superAdmins.length <= 1) {
          return jsonResponse({ error: 'Phải giữ lại ít nhất 1 Quản trị Tối cao (Super Admin).' }, 400);
        }
        target.role = 'customer';
        target.adminRole = 'none';
        target.adminPermissions = [];
        writeState(state);
        return jsonResponse({ ok: true });
      }
      if (body.fullName && String(body.fullName).trim()) target.fullName = String(body.fullName).trim();
      if (body.adminRole) target.adminRole = String(body.adminRole);
      if (target.adminRole === 'super_admin') {
        target.adminPermissions = [...ALL_ADMIN_PERMISSIONS];
      } else if (Array.isArray(body.permissions)) {
        target.adminPermissions = body.permissions;
      }
      writeState(state);
      return jsonResponse({ ok: true });
    }
    if (pathname.startsWith('/api/admin/team/') && method === 'DELETE') {
      const id = Number(pathname.split('/').pop());
      const target = state.users.find((x) => x.id === id);
      if (!target) return jsonResponse({ error: 'Không tìm thấy nhân sự.' }, 404);
      target.role = 'customer';
      target.adminRole = 'none';
      target.adminPermissions = [];
      writeState(state);
      return jsonResponse({ ok: true });
    }
    if (pathname === '/api/admin/wallets' && method === 'GET') {
      return jsonResponse({
        users: state.users.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.fullName,
          member_code: u.memberCode,
          tier: u.tier,
          wallet_balance: u.walletBalance ?? 0,
          points: u.points ?? 0,
        })),
        transactions: state.walletTransactions.slice(0, 100),
      });
    }
    if (pathname === '/api/admin/wallets/adjust' && method === 'POST') {
      const targetUserId = Number(body.userId);
      const amountDelta = Number(body.amountDelta || 0);
      const pointsDelta = Number(body.pointsDelta || 0);
      const note = String(body.note || 'Admin điều chỉnh').trim();
      const target = state.users.find((u) => u.id === targetUserId);
      if (!target) return jsonResponse({ error: 'Không tìm thấy thành viên.' }, 404);
      target.walletBalance = Math.max(0, (target.walletBalance ?? 0) + amountDelta);
      target.points = Math.max(0, (target.points ?? 0) + pointsDelta);
      if (amountDelta !== 0) {
        state.walletTransactions.unshift({
          id: Date.now(),
          user_id: target.id,
          type: amountDelta > 0 ? 'admin_credit' : 'admin_debit',
          amount: Math.abs(amountDelta),
          bonus_amount: 0,
          points_delta: pointsDelta,
          balance_after: target.walletBalance,
          note,
          created_at: new Date().toISOString(),
        });
      }
      writeState(state);
      return jsonResponse({
        ok: true,
        walletBalance: target.walletBalance,
        points: target.points,
      });
    }
    if (pathname === '/api/admin/wallet/requests' && method === 'GET') {
      const approvalMode = state.settingsOverlay.wallet_approval_mode === 'auto' ? 'auto' : 'manual';
      const requests = (state.settingsOverlay._wallet_requests ? JSON.parse(state.settingsOverlay._wallet_requests) : []) as any[];
      return jsonResponse({ approvalMode, requests });
    }
    if (pathname === '/api/admin/wallet/approval-mode' && method === 'PATCH') {
      const mode = body.mode === 'auto' ? 'auto' : 'manual';
      state.settingsOverlay.wallet_approval_mode = mode;
      writeState(state);
      return jsonResponse({ ok: true, approvalMode: mode });
    }
    if (/^\/api\/admin\/wallet\/requests\/\d+\/(approve|reject)$/.test(pathname) && method === 'POST') {
      const parts = pathname.split('/');
      const action = parts.pop();
      const id = Number(parts.pop());
      const requests = (state.settingsOverlay._wallet_requests ? JSON.parse(state.settingsOverlay._wallet_requests) : []) as any[];
      const reqItem = requests.find((r) => r.id === id);
      if (!reqItem) return jsonResponse({ error: 'Không tìm thấy yêu cầu nạp tiền.' }, 404);
      if (reqItem.status !== 'pending') return jsonResponse({ error: 'Yêu cầu đã được xử lý.' }, 400);
      reqItem.status = action === 'approve' ? 'approved' : 'rejected';
      reqItem.reviewed_at = new Date().toISOString();
      if (action === 'approve') {
        const target = state.users.find((u) => u.id === reqItem.user_id);
        if (target) {
          target.walletBalance = (target.walletBalance ?? 0) + Number(reqItem.total_credit_vnd || 0);
          target.points = (target.points ?? 0) + Number(reqItem.points_delta || 0);
          state.walletTransactions.unshift({
            id: Date.now(),
            user_id: target.id,
            type: 'topup',
            amount: reqItem.amount_vnd,
            bonus_amount: reqItem.bonus_vnd,
            points_delta: reqItem.points_delta,
            balance_after: target.walletBalance,
            note: `Duyệt nạp ví ${Number(reqItem.amount_vnd).toLocaleString('vi-VN')}₫ (+${reqItem.bonus_pct}%)`,
            created_at: new Date().toISOString(),
          });
        }
      }
      state.settingsOverlay._wallet_requests = JSON.stringify(requests);
      writeState(state);
      return jsonResponse({ ok: true });
    }
  }

  // ROAR Wallet (Member)
  if (pathname === '/api/wallet' && method === 'GET') {
    const me = resolveTokenUser(headers, state);
    if (!me) return jsonResponse({ error: 'Vui lòng đăng nhập.' }, 401);
    const transactions = state.walletTransactions.filter((t) => t.user_id === me.id).slice(0, 50);
    return jsonResponse({
      walletBalance: me.walletBalance ?? 0,
      walletBalanceVnd: me.walletBalance ?? 0,
      points: { available: me.points ?? 120, pending: 0, redeemed: 0 },
      transactions,
    });
  }

  if (pathname === '/api/wallet/topup' && method === 'POST') {
    const me = resolveTokenUser(headers, state);
    if (!me) return jsonResponse({ error: 'Vui lòng đăng nhập.' }, 401);
    const amount = Math.max(0, Number(body.amountVnd || body.amount || 0));
    if (amount < 50000) return jsonResponse({ error: 'Số tiền nạp tối thiểu 50.000đ.' }, 400);
    const bonusPct = amount >= 2000000 ? 30 : amount >= 1000000 ? 20 : amount >= 500000 ? 15 : 10;
    const bonusAmount = Math.round((amount * bonusPct) / 100);
    const totalCredit = amount + bonusAmount;
    const bonusPoints = Math.floor(totalCredit / 10000);
    const refCode = `TOPUP-${Date.now().toString(36).toUpperCase()}`;
    const approvalMode = state.settingsOverlay.wallet_approval_mode === 'auto' ? 'auto' : 'manual';
    const requests = (state.settingsOverlay._wallet_requests ? JSON.parse(state.settingsOverlay._wallet_requests) : []) as any[];

    if (approvalMode === 'manual') {
      const reqObj = {
        id: Date.now(),
        user_id: me.id,
        full_name: me.fullName,
        email: me.email,
        member_code: me.memberCode,
        amount_vnd: amount,
        bonus_pct: bonusPct,
        bonus_vnd: bonusAmount,
        total_credit_vnd: totalCredit,
        points_delta: bonusPoints,
        reference_code: refCode,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      requests.unshift(reqObj);
      state.settingsOverlay._wallet_requests = JSON.stringify(requests);
      writeState(state);
      return jsonResponse({
        ok: true,
        status: 'pending',
        approvalMode: 'manual',
        referenceCode: refCode,
        amountVnd: amount,
        bonusPct,
        bonusVnd: bonusAmount,
        totalCreditVnd: totalCredit,
        pointsDelta: bonusPoints,
        walletBalanceVnd: me.walletBalance ?? 0,
      });
    }

    me.walletBalance = (me.walletBalance ?? 0) + totalCredit;
    me.points = (me.points ?? 0) + bonusPoints;
    const tx = {
      id: Date.now(),
      user_id: me.id,
      type: 'topup',
      amount,
      bonus_amount: bonusAmount,
      points_delta: bonusPoints,
      balance_after: me.walletBalance,
      note: `Nạp ví ROAR +${bonusPct}% thưởng`,
      created_at: new Date().toISOString(),
    };
    state.walletTransactions.unshift(tx);
    writeState(state);
    return jsonResponse({
      ok: true,
      status: 'approved',
      approvalMode: 'auto',
      referenceCode: refCode,
      amountVnd: amount,
      bonusPct,
      bonusVnd: bonusAmount,
      totalCreditVnd: totalCredit,
      pointsDelta: bonusPoints,
      walletBalanceVnd: me.walletBalance,
      walletBalance: me.walletBalance,
      points: me.points,
      bonusAmount,
      bonusPoints,
      transaction: tx,
    });
  }

  // Daily Check-in 7-day Streak Game
  const CHECKIN_SCHEDULE = [
    { day: 1, points: 10, label: 'Ngày 1', bonus: false },
    { day: 2, points: 15, label: 'Ngày 2', bonus: false },
    { day: 3, points: 40, label: 'Ngày 3 • Bonus 3 ngày', bonus: true },
    { day: 4, points: 20, label: 'Ngày 4', bonus: false },
    { day: 5, points: 25, label: 'Ngày 5', bonus: false },
    { day: 6, points: 30, label: 'Ngày 6', bonus: false },
    { day: 7, points: 100, label: 'Ngày 7 • Quà Tuần ROAR', bonus: true },
  ];

  if (pathname === '/api/checkin/status' && method === 'GET') {
    const me = resolveTokenUser(headers, state);
    if (!me) return jsonResponse({ error: 'Vui lòng đăng nhập.' }, 401);
    const today = new Date().toISOString().slice(0, 10);
    const rec = state.checkins[me.id] || { streak: 0, lastCheckinDate: '', history: [] };
    const checkedInToday = rec.lastCheckinDate === today;
    return jsonResponse({
      checkedInToday,
      currentStreak: rec.streak,
      nextDay: checkedInToday ? rec.streak : (rec.streak % 7) + 1,
      schedule: CHECKIN_SCHEDULE,
      history: rec.history.slice(0, 14),
      points: me.points ?? 0,
    });
  }

  if (pathname === '/api/checkin' && method === 'POST') {
    const me = resolveTokenUser(headers, state);
    if (!me) return jsonResponse({ error: 'Vui lòng đăng nhập.' }, 401);
    const today = new Date().toISOString().slice(0, 10);
    const rec = state.checkins[me.id] || { streak: 0, lastCheckinDate: '', history: [] };
    if (rec.lastCheckinDate === today) {
      return jsonResponse({ error: 'Bạn đã điểm danh hôm nay rồi!' }, 400);
    }
    const nextDay = (rec.streak % 7) + 1;
    const reward = CHECKIN_SCHEDULE[nextDay - 1] || CHECKIN_SCHEDULE[0];
    rec.streak = nextDay;
    rec.lastCheckinDate = today;
    rec.history.unshift({
      date: today,
      day: nextDay,
      points: reward.points,
      label: reward.label,
    });
    state.checkins[me.id] = rec;
    me.points = (me.points ?? 0) + reward.points;
    writeState(state);
    return jsonResponse({
      ok: true,
      day: nextDay,
      pointsAwarded: reward.points,
      currentStreak: rec.streak,
      totalPoints: me.points,
      checkedInToday: true,
      schedule: CHECKIN_SCHEDULE,
    });
  }

  return null;
}
