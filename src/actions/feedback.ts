"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/** Returns true if current user is paid (is_subscriber), false if not on a paid plan, null if not logged in. */
async function getCurrentUserIsPaidTier(): Promise<boolean | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_subscriber")
    .eq("user_id", user.id)
    .single();
  return profile ? Boolean(profile.is_subscriber) : false;
}

export async function submitSuggestion(params: {
  email?: string | null;
  content: string;
}): Promise<{ error?: string }> {
  const content = params.content?.trim();
  if (!content || content.length < 2) return { error: "Please enter a suggestion (at least 2 characters)." };
  try {
    const isPaid = await getCurrentUserIsPaidTier();
    if (isPaid === null) return { error: "Sign in to submit a suggestion." };
    if (!isPaid) return { error: "Suggestions are for paid subscribers only." };
    const supabase = await createClient();
    const { error } = await supabase.from("suggestions").insert({
      email: params.email?.trim() || null,
      content,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to submit suggestion." };
  }
}

export async function submitReview(params: {
  authorName?: string | null;
  content: string;
  rating?: number | null;
}): Promise<{ error?: string }> {
  const content = params.content?.trim();
  if (!content || content.length < 2) return { error: "Please enter your review (at least 2 characters)." };
  const rating = params.rating != null ? Math.min(5, Math.max(1, Math.round(params.rating))) : null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const isPaid = await getCurrentUserIsPaidTier();
      if (!isPaid) return { error: "Reviews are for paid subscribers only. Free trial users cannot submit." };
      try {
        const admin = createServiceRoleClient();
        const { data: existing, error: existingError } = await admin
          .from("reviews")
          .select("id")
          .eq("author_user_id", user.id)
          .in("status", ["pending", "approved"])
          .limit(1)
          .maybeSingle();
        if (existingError) return { error: existingError.message };
        if (existing) return { error: "You already have a review in progress or published." };
      } catch {
        // If service role isn't configured, rely on the DB unique index.
      }
    } else {
      return { error: "Sign in with a paid account to submit a review." };
    }

    const { error } = await supabase.from("reviews").insert({
      author_name: params.authorName?.trim() || null,
      author_user_id: user?.id ?? null,
      content,
      rating,
      status: "pending",
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to submit review." };
  }
}

export async function getReviewEligibility(): Promise<{ canSubmit: boolean; reason?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canSubmit: false, reason: "Sign in with a paid account to submit a review." };

    const isPaid = await getCurrentUserIsPaidTier();
    if (!isPaid) return { canSubmit: false, reason: "Reviews are for paid subscribers only." };

    const admin = createServiceRoleClient();
    const { data: existing, error } = await admin
      .from("reviews")
      .select("id")
      .eq("author_user_id", user.id)
      .in("status", ["pending", "approved"])
      .limit(1)
      .maybeSingle();
    if (error) return { canSubmit: true, error: error.message };
    if (existing) return { canSubmit: false, reason: "You already submitted a review." };
    return { canSubmit: true };
  } catch (e) {
    return { canSubmit: true, error: e instanceof Error ? e.message : "Failed to check review eligibility." };
  }
}

export type MyReviewRow = {
  id: string;
  author_name: string | null;
  content: string;
  rating: number | null;
  status: string;
  created_at: string;
};

export async function getMyReview(): Promise<{ review: MyReviewRow | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { review: null };

    const { data, error } = await supabase
      .from("reviews")
      .select("id, author_name, content, rating, status, created_at")
      .eq("author_user_id", user.id)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error) {
      if (!data) return { review: null };
      return {
        review: {
          id: data.id,
          author_name: data.author_name ?? null,
          content: data.content,
          rating: data.rating ?? null,
          status: data.status,
          created_at: data.created_at,
        },
      };
    }

    // Fallback: if RLS/migration hasn't been applied yet, try service role.
    const admin = createServiceRoleClient();
    const { data: data2, error: error2 } = await admin
      .from("reviews")
      .select("id, author_name, content, rating, status, created_at")
      .eq("author_user_id", user.id)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error2) return { review: null, error: error2.message };
    if (!data2) return { review: null };
    return {
      review: {
        id: data2.id,
        author_name: data2.author_name ?? null,
        content: data2.content,
        rating: data2.rating ?? null,
        status: data2.status,
        created_at: data2.created_at,
      },
    };
  } catch (e) {
    return { review: null, error: e instanceof Error ? e.message : "Failed to load your review." };
  }
}

export type ApprovedReviewRow = {
  id: string;
  author_name: string | null;
  content: string;
  rating: number | null;
  created_at: string;
};

/** Public: fetch only approved reviews for landing page. */
export async function getApprovedReviews(): Promise<{ reviews: ApprovedReviewRow[]; error?: string }> {
  try {
    // Service role avoids relying on session + RLS for public listing; only approved rows are selected.
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("reviews")
      .select("id, author_name, content, rating, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) return { reviews: [], error: error.message };
    return { reviews: (data ?? []).map((r) => ({
      id: r.id,
      author_name: r.author_name ?? null,
      content: r.content,
      rating: r.rating ?? null,
      created_at: r.created_at,
    })) };
  } catch (e) {
    return { reviews: [], error: e instanceof Error ? e.message : "Failed to load reviews." };
  }
}

export type ReviewForAdminRow = {
  id: string;
  author_name: string | null;
  content: string;
  rating: number | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

/** Admin only: list all reviews. */
export async function getReviewsForAdmin(): Promise<{ reviews: ReviewForAdminRow[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { reviews: [], error: "Not logged in." };
  const admin = createServiceRoleClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!profile?.is_admin) return { reviews: [], error: "Forbidden." };
  const { data, error } = await admin
    .from("reviews")
    .select("id, author_name, content, rating, status, created_at, reviewed_at")
    .order("created_at", { ascending: false });
  if (error) return { reviews: [], error: error.message };
  return {
    reviews: (data ?? []).map((r) => ({
      id: r.id,
      author_name: r.author_name ?? null,
      content: r.content,
      rating: r.rating ?? null,
      status: r.status,
      created_at: r.created_at,
      reviewed_at: r.reviewed_at ?? null,
    })),
  };
}

export async function updateReview(
  reviewId: string,
  params: { authorName?: string | null; content: string; rating?: number | null }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const admin = createServiceRoleClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!profile?.is_admin) return { error: "Forbidden." };
  const { data: existing, error: fetchError } = await admin
    .from("reviews")
    .select("id, status")
    .eq("id", reviewId)
    .single();
  if (fetchError || !existing) return { error: "Review not found." };
  if (existing.status !== "pending") return { error: "Only pending reviews can be edited." };
  const content = params.content?.trim();
  if (!content || content.length < 2) return { error: "Please enter your review (at least 2 characters)." };
  const rating = params.rating != null ? Math.min(5, Math.max(1, Math.round(params.rating))) : null;
  const { error } = await admin
    .from("reviews")
    .update({
      author_name: params.authorName?.trim() || null,
      content,
      rating,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);
  if (error) return { error: error.message };
  return {};
}

export async function setReviewStatus(
  reviewId: string,
  status: "approved" | "rejected"
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const admin = createServiceRoleClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!profile?.is_admin) return { error: "Forbidden." };
  const { error } = await admin
    .from("reviews")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId);
  if (error) return { error: error.message };
  return {};
}

export type SuggestionForAdminRow = {
  id: string;
  email: string | null;
  content: string;
  created_at: string;
};

/** Admin only: list all suggestions. */
export async function getSuggestionsForAdmin(): Promise<{ suggestions: SuggestionForAdminRow[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { suggestions: [], error: "Not logged in." };
  const admin = createServiceRoleClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!profile?.is_admin) return { suggestions: [], error: "Forbidden." };
  const { data, error } = await admin
    .from("suggestions")
    .select("id, email, content, created_at")
    .order("created_at", { ascending: false });
  if (error) return { suggestions: [], error: error.message };
  return {
    suggestions: (data ?? []).map((s) => ({
      id: s.id,
      email: s.email ?? null,
      content: s.content,
      created_at: s.created_at,
    })),
  };
}
