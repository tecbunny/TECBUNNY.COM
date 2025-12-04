-- Migration: Critical Inventory Functions
-- Created: 2025-12-05
-- Description: Adds atomic stock decrement functions for products and inventory tables

-- Function 1: Decrement Product Stock (Simple)
create or replace function decrement_product_stock(p_product_id uuid, p_quantity int)
returns void
language plpgsql
as $$
begin
  update products
  set stock_quantity = stock_quantity - p_quantity
  where id = p_product_id;
  
  if not found then
    raise exception 'Product not found';
  end if;
end;
$$;

-- Function 2: Decrement Inventory Stock with Serial Numbers (Advanced)
create or replace function decrement_stock_with_serials(p_product_id uuid, p_quantity int, p_serials text[])
returns void
language plpgsql
as $$
declare
  v_current_serials text[];
  v_new_serials text[];
begin
  -- Lock the row for update to prevent race conditions
  select serial_numbers into v_current_serials
  from inventory
  where product_id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found in inventory';
  end if;

  -- Remove used serials if provided
  if p_serials is not null and array_length(p_serials, 1) > 0 then
    select array_agg(elem) into v_new_serials
    from unnest(v_current_serials) elem
    where elem <> all(p_serials);
    
    -- Handle case where all serials are removed (array_agg returns null)
    if v_new_serials is null then
      v_new_serials := '{}';
    end if;
  else
    v_new_serials := v_current_serials;
  end if;

  update inventory
  set stock = stock - p_quantity,
      serial_numbers = v_new_serials
  where product_id = p_product_id;
end;
$$;
