import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { slug, key, action, payload } = await req.json();

    if (!slug || !key || !action) {
      return new Response(
        JSON.stringify({ error: "Missing fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // 🔐 Validate admin access
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .eq("admin_secret", key)
      .single();

    if (!restaurant) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const restaurant_id = restaurant.id;

    if (action === "list") {
      const { data: categories } = await admin
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurant_id)
        .order("order_index");

      const { data: items } = await admin
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurant_id)
        .order("name");

      return new Response(
        JSON.stringify({ categories, items }),
        { headers: corsHeaders }
      );
    }

if (action === "add_item") {
  const { name, description, price, category_id } = payload;

  const { data, error } = await admin
    .from("menu_items")
    .insert({
      restaurant_id,
      name,
      description: description ?? null,
      price,
      category_id,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify(data), { headers: corsHeaders });
}

if (action === "update_item") {
  const { id, ...fields } = payload;

  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

  const { data, error } = await admin
    .from("menu_items")
    .update(fields)
    .eq("id", id)
    .eq("restaurant_id", restaurant_id)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify(data), { headers: corsHeaders });
}


    if (action === "delete_item") {
      const { id } = payload;
      await admin
        .from("menu_items")
        .delete()
        .eq("id", id)
        .eq("restaurant_id", restaurant_id);

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
