
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  loyalty_coins integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_chinese text,
  category text not null,
  base_price integer not null check (base_price >= 0),
  image_url text,
  description text,
  cook_minutes integer not null default 10,
  active boolean not null default true,
  customization_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_flags (
  ingredient_code text primary key,
  label text not null,
  is_available boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'received' check (status in ('received', 'cooking', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  order_type text not null default 'pickup' check (order_type in ('pickup', 'dine_in', 'delivery')),
  scheduled_slot text,
  priority_delivery boolean not null default false,
  customer_name text not null,
  customer_email text not null,
  delivery_address text,
  notes text,
  subtotal integer not null default 0,
  coins_redeemed integer not null default 0,
  earned_coins integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
before update on public.orders
for each row execute procedure public.touch_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  title text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null default 0,
  line_total integer not null default 0,
  customization jsonb not null default '{}'::jsonb
);

insert into public.menu_items
  (slug, name, name_chinese, category, base_price, image_url, description, cook_minutes, customization_schema)
values
  ('soy-chicken-rice', 'Soy Sauce Chicken Rice', '豉油雞飯', 'Rice Plates', 48, 'https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?auto=format&fit=crop&w=1200&q=80', 'Tender soy-braised chicken thigh over fragrant rice.', 12, '{"singleChoice": [{"key": "riceSize", "label": "Rice Size", "required": true, "options": [{"code": "regular-rice", "label": "Regular", "price": 0}, {"code": "large-rice", "label": "Large", "price": 6}]}, {"key": "sauce", "label": "Sauce", "required": true, "options": [{"code": "soy-gravy", "label": "Soy Gravy", "price": 0}, {"code": "ginger-scallion", "label": "Ginger Scallion", "price": 4}]}, {"key": "spice", "label": "Spice Level", "required": true, "options": [{"code": "none", "label": "None", "price": 0}, {"code": "mild", "label": "Mild", "price": 0}, {"code": "hot", "label": "Hot", "price": 0}]}], "multiChoice": [{"key": "extras", "label": "Extras", "options": [{"code": "fried-egg", "label": "Fried Egg", "price": 8}, {"code": "bok-choy", "label": "Bok Choy", "price": 6}, {"code": "tofu-skin", "label": "Tofu Skin", "price": 7}]}]}'::jsonb),
  ('char-siu-rice', 'Char Siu Rice', '叉燒飯', 'Rice Plates', 46, 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1200&q=80', 'Honey-glazed BBQ pork with steamed jasmine rice.', 10, '{"singleChoice": [{"key": "riceSize", "label": "Rice Size", "required": true, "options": [{"code": "regular-rice", "label": "Regular", "price": 0}, {"code": "large-rice", "label": "Large", "price": 6}]}, {"key": "sauce", "label": "Sauce", "required": true, "options": [{"code": "char-siu-sauce", "label": "Char Siu Sauce", "price": 0}, {"code": "spicy-garlic", "label": "Spicy Garlic", "price": 4}]}], "multiChoice": [{"key": "extras", "label": "Extras", "options": [{"code": "pickled-cucumber", "label": "Pickled Cucumber", "price": 5}, {"code": "broccoli", "label": "Broccoli", "price": 6}, {"code": "soft-boiled-egg", "label": "Soft-Boiled Egg", "price": 8}]}]}'::jsonb),
  ('beef-brisket-noodle', 'Beef Brisket Noodle', '牛腩麵', 'Noodles', 52, 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=1200&q=80', 'Rich beef brisket broth with springy noodles.', 11, '{"singleChoice": [{"key": "noodleType", "label": "Noodle Type", "required": true, "options": [{"code": "egg-noodle", "label": "Egg Noodle", "price": 0}, {"code": "rice-noodle", "label": "Rice Noodle", "price": 0}, {"code": "udon", "label": "Udon", "price": 5}]}, {"key": "spice", "label": "Spice Level", "required": true, "options": [{"code": "none", "label": "None", "price": 0}, {"code": "mild", "label": "Mild", "price": 0}, {"code": "hot", "label": "Hot", "price": 0}]}], "multiChoice": [{"key": "extras", "label": "Extras", "options": [{"code": "daikon", "label": "Daikon", "price": 6}, {"code": "chili-oil", "label": "Chili Oil", "price": 4}, {"code": "extra-beef", "label": "Extra Beef", "price": 16}]}]}'::jsonb),
  ('wonton-noodle-soup', 'Wonton Noodle Soup', '雲吞麵', 'Noodles', 49, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80', 'Classic HK wontons in a clear seafood broth.', 8, '{"singleChoice": [{"key": "noodleType", "label": "Noodle Type", "required": true, "options": [{"code": "egg-noodle", "label": "Egg Noodle", "price": 0}, {"code": "lai-fun", "label": "Lai Fun", "price": 3}]}, {"key": "spice", "label": "Spice Level", "required": true, "options": [{"code": "none", "label": "None", "price": 0}, {"code": "mild", "label": "Mild", "price": 0}]}], "multiChoice": [{"key": "extras", "label": "Extras", "options": [{"code": "extra-wonton", "label": "Extra Wonton", "price": 15}, {"code": "bok-choy", "label": "Bok Choy", "price": 6}, {"code": "scallion", "label": "Scallion", "price": 3}]}]}'::jsonb),
  ('century-egg-congee', 'Century Egg & Lean Pork Congee', '皮蛋瘦肉粥', 'Congee', 45, 'https://images.unsplash.com/photo-1541696490-8744a5dc0228?auto=format&fit=crop&w=1200&q=80', 'Comfort congee with century egg and lean pork.', 15, '{"singleChoice": [{"key": "portion", "label": "Portion", "required": true, "options": [{"code": "regular", "label": "Regular", "price": 0}, {"code": "large", "label": "Large", "price": 7}]}], "multiChoice": [{"key": "extras", "label": "Extras", "options": [{"code": "fried-dough", "label": "Youtiao", "price": 6}, {"code": "ginger", "label": "Fresh Ginger", "price": 3}, {"code": "extra-pork", "label": "Extra Pork", "price": 12}]}]}'::jsonb),
  ('milk-tea', 'Hong Kong Milk Tea', '港式奶茶', 'Drinks', 18, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80', 'Strong silky milk tea, hot or cold.', 3, '{"singleChoice": [{"key": "temperature", "label": "Temperature", "required": true, "options": [{"code": "hot", "label": "Hot", "price": 0}, {"code": "cold", "label": "Cold", "price": 2}]}, {"key": "sweetness", "label": "Sweetness", "required": true, "options": [{"code": "regular", "label": "Regular", "price": 0}, {"code": "less-sugar", "label": "Less Sugar", "price": 0}, {"code": "no-sugar", "label": "No Sugar", "price": 0}]}], "multiChoice": []}'::jsonb),
  ('build-your-own-bowl', 'Build Your Own Bowl', '自選飯盒', 'Signature Builder', 38, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 'Pick your base, protein, sides, sauce, and spice level.', 14, '{"singleChoice": [{"key": "base", "label": "Base", "required": true, "options": [{"code": "rice", "label": "Rice", "price": 0}, {"code": "noodle", "label": "Noodle", "price": 4}, {"code": "salad", "label": "Salad", "price": 5}]}, {"key": "protein", "label": "Protein", "required": true, "options": [{"code": "chicken", "label": "Chicken", "price": 12}, {"code": "beef", "label": "Beef", "price": 16}, {"code": "tofu", "label": "Tofu", "price": 8}]}, {"key": "sauce", "label": "Sauce", "required": true, "options": [{"code": "ginger-scallion", "label": "Ginger Scallion", "price": 0}, {"code": "black-pepper", "label": "Black Pepper", "price": 0}, {"code": "satay", "label": "Satay", "price": 2}]}, {"key": "spice", "label": "Spice Level", "required": true, "options": [{"code": "none", "label": "None", "price": 0}, {"code": "mild", "label": "Mild", "price": 0}, {"code": "medium", "label": "Medium", "price": 0}, {"code": "hot", "label": "Hot", "price": 0}]}], "multiChoice": [{"key": "sides", "label": "Sides", "options": [{"code": "fried-egg", "label": "Fried Egg", "price": 8}, {"code": "broccoli", "label": "Broccoli", "price": 6}, {"code": "corn", "label": "Corn", "price": 5}, {"code": "mushroom", "label": "Mushroom", "price": 7}]}]}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  name_chinese = excluded.name_chinese,
  category = excluded.category,
  base_price = excluded.base_price,
  image_url = excluded.image_url,
  description = excluded.description,
  cook_minutes = excluded.cook_minutes,
  customization_schema = excluded.customization_schema,
  active = true;

insert into public.inventory_flags (ingredient_code, label, is_available)
values
  ('beef', 'Beef', true),
  ('black-pepper', 'Black Pepper', true),
  ('bok-choy', 'Bok Choy', true),
  ('broccoli', 'Broccoli', true),
  ('char-siu-sauce', 'Char Siu Sauce', true),
  ('chicken', 'Chicken', true),
  ('chili-oil', 'Chili Oil', true),
  ('cold', 'Cold', true),
  ('corn', 'Corn', true),
  ('daikon', 'Daikon', true),
  ('egg-noodle', 'Egg Noodle', true),
  ('extra-beef', 'Extra Beef', true),
  ('extra-pork', 'Extra Pork', true),
  ('extra-wonton', 'Extra Wonton', true),
  ('fried-dough', 'Youtiao', true),
  ('fried-egg', 'Fried Egg', true),
  ('ginger', 'Fresh Ginger', true),
  ('ginger-scallion', 'Ginger Scallion', true),
  ('hot', 'Hot', true),
  ('lai-fun', 'Lai Fun', true),
  ('large', 'Large', true),
  ('large-rice', 'Large', true),
  ('less-sugar', 'Less Sugar', true),
  ('medium', 'Medium', true),
  ('mild', 'Mild', true),
  ('mushroom', 'Mushroom', true),
  ('no-sugar', 'No Sugar', true),
  ('none', 'None', true),
  ('noodle', 'Noodle', true),
  ('pickled-cucumber', 'Pickled Cucumber', true),
  ('regular', 'Regular', true),
  ('regular-rice', 'Regular', true),
  ('rice', 'Rice', true),
  ('rice-noodle', 'Rice Noodle', true),
  ('salad', 'Salad', true),
  ('satay', 'Satay', true),
  ('scallion', 'Scallion', true),
  ('soft-boiled-egg', 'Soft-Boiled Egg', true),
  ('soy-gravy', 'Soy Gravy', true),
  ('spicy-garlic', 'Spicy Garlic', true),
  ('tofu', 'Tofu', true),
  ('tofu-skin', 'Tofu Skin', true),
  ('udon', 'Udon', true)
on conflict (ingredient_code) do nothing;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.menu_items enable row level security;
alter table public.inventory_flags enable row level security;

drop policy if exists "Profiles owner read" on public.profiles;
create policy "Profiles owner read" on public.profiles
for select using (auth.uid() = user_id);

drop policy if exists "Profiles owner update" on public.profiles;
create policy "Profiles owner update" on public.profiles
for update using (auth.uid() = user_id);

drop policy if exists "Menu public read" on public.menu_items;
create policy "Menu public read" on public.menu_items
for select using (true);

drop policy if exists "Inventory public read" on public.inventory_flags;
create policy "Inventory public read" on public.inventory_flags
for select using (true);

drop policy if exists "Orders owner read" on public.orders;
create policy "Orders owner read" on public.orders
for select using (auth.uid() = user_id);

drop policy if exists "Order items owner read" on public.order_items;
create policy "Order items owner read" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  )
);

