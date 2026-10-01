export type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type UserRoleName =
  | "buyer"
  | "seller"
  | "owner"
  | "agent"
  | "agency_admin"
  | "builder"
  | "developer"
  | "admin"
  | "super_admin";

export type UserRole = {
  id: string;
  user_id: string;
  role: UserRoleName;
  created_at: string;
};

export type Agency = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  gst_number: string | null;
  rera_number: string | null;
  is_verified: boolean;
  verification_status: "pending" | "submitted" | "verified" | "rejected";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AgencyMember = {
  id: string;
  agency_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "agent" | "staff";
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ListingType = "sale" | "rent" | "lease" | "pg";
export type PropertyStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "sold"
  | "rented"
  | "expired"
  | "archived";

export type Property = {
  id: string;
  owner_id: string;
  agency_id: string | null;
  agent_id: string | null;
  category_id: string;
  title: string;
  slug: string;
  description: string | null;
  listing_type: ListingType;
  property_type: string | null;
  price: string | null;
  price_unit: string | null;
  is_price_negotiable: boolean;
  area: string | null;
  area_unit: string;
  built_up_area: string | null;
  carpet_area: string | null;
  plot_area: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconies: number | null;
  floor_number: number | null;
  total_floors: number | null;
  parking_spaces: number | null;
  furnishing_status: "unfurnished" | "semi_furnished" | "furnished" | null;
  construction_year: number | null;
  possession_status: string | null;
  facing: string | null;
  status: PropertyStatus;
  verification_status: "pending" | "submitted" | "verified" | "rejected" | "active";
  is_featured: boolean;
  is_premium: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyCard = Property & {
  category_name?: string;
  category_slug?: string;
  city?: string | null;
  locality?: string | null;
  district?: string | null;
  state?: string | null;
  cover_image?: string | null;
  listing_label?: string | null;
  listing_term?: "month" | "year" | null;
  is_favorite?: boolean;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_avatar?: string | null;
  owner_verified?: boolean;
  latitude?: string | null;
  longitude?: string | null;
};

export type PropertyDetail = PropertyCard & {
  address?: string | null;
  landmark?: string | null;
  pincode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  images?: Array<{ id: string; image_url: string; image_type: string; is_cover: boolean }>;
  amenities?: Array<{ id: string; name: string; slug: string; icon: string | null }>;
  features?: Array<{ id: string; feature_key: string; feature_value: string | null }>;
  prices?: Array<{
    id: string;
    price: string;
    maintenance_charge: string | null;
    security_deposit: string | null;
  }>;
};

export type Inquiry = {
  id: string;
  property_id: string;
  buyer_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  inquiry_type: string | null;
  status: "new" | "contacted" | "interested" | "closed" | "spam";
  created_at: string;
  property_title?: string;
  property_slug?: string;
  cover_image?: string | null;
};

export type Visit = {
  id: string;
  property_id: string;
  buyer_id: string | null;
  agent_id: string | null;
  scheduled_at: string | null;
  status: "requested" | "confirmed" | "completed" | "cancelled" | "rescheduled";
  notes: string | null;
  created_at: string;
  property_title?: string;
  property_slug?: string;
  city?: string | null;
  locality?: string | null;
  cover_image?: string | null;
};

export type WalletTransaction = {
  id: string;
  amount: string;
  direction: "credit" | "debit";
  reason: string;
  property_id: string | null;
  property_title: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: { property_id?: string; inquiry_id?: string; conversation_id?: string; visit_id?: string } | null;
  is_read: boolean;
  created_at: string;
};

export type ChatThread = {
  id: string;
  property_id: string;
  buyer_id: string;
  owner_id: string;
  created_at: string;
  property_title?: string;
  other_name?: string | null;
  other_avatar?: string | null;
  last_message?: string | null;
  last_at?: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_kind?: "image" | "document" | null;
  deleted?: boolean;
  reply_to_id?: string | null;
  reply_body?: string | null;
  reply_kind?: "image" | "document" | null;
  reply_name?: string | null;
  reply_deleted?: boolean;
  reactions?: Array<{ emoji: string; count: number; mine?: boolean }>;
  created_at: string;
  mine?: boolean;
};

export type Me = {
  profile: UserProfile | null;
  roles: UserRoleName[];
  is_admin: boolean;
  is_super_admin: boolean;
};

export type SavedSearch = {
  id: string;
  user_id: string;
  name: string;
  city: string | null;
  locality: string | null;
  category_id: string | null;
  listing_type: ListingType | null;
  min_price: string | null;
  max_price: string | null;
  min_area: string | null;
  max_area: string | null;
  bedrooms: number | null;
  created_at: string;
  updated_at: string;
};
