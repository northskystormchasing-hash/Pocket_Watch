import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabaseClient";
import {
  Home, Film, User, Sun, Moon, Heart, MessageCircle, LogOut,
  Image as ImageIcon, Video, Users, Plus, Link as LinkIcon, X, Camera
} from "lucide-react";

const theme = {
  light: { bg: "#F1E9D8", card: "#FBF6EC", text: "#3D2E22", subtext: "#7A6752", brass: "#B08D57", brassDeep: "#8C6D3F", forest: "#3F5B44", border: "#E0D3B8" },
  dark: { bg: "#1C1815", card: "#26201B", text: "#E8DCC5", subtext: "#A69880", brass: "#C9A464", brassDeep: "#DDB876", forest: "#6E9478", border: "#3A322A" },
};

function Watermark({ c }) {
  return (
    <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="16" stroke={c.brass} strokeWidth="2" fill={c.card} />
      <circle cx="20" cy="20" r="1.6" fill={c.brass} />
      <line x1="20" y1="20" x2="20" y2="10" stroke={c.brass} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="20" y1="20" x2="14" y2="23" stroke={c.brassDeep} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="20" y1="3" x2="20" y2="6" stroke={c.brass} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const inputStyle = (c) => ({
  width: "100%", padding: "12px 14px", borderRadius: 10, marginBottom: 10,
  border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 15, fontFamily: "inherit",
});
const btnStyle = (c) => ({
  padding: "10px 16px", borderRadius: 10, border: "none",
  background: c.brass, color: c.card, fontWeight: 700, cursor: "pointer", fontSize: 14,
});
const ghostBtnStyle = (c) => ({
  padding: "8px 14px", borderRadius: 10, border: `1px solid ${c.border}`,
  background: "none", color: c.text, cursor: "pointer", fontSize: 13,
});

function LoginScreen({ c, pendingJoinCode }) {
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (inviteCode.trim()) {
      const { data: invite, error: inviteErr } = await supabase
        .from("invites").select("*").eq("code", inviteCode.trim())
        .is("used_by", null).gt("expires_at", new Date().toISOString()).single();
      if (inviteErr || !invite) {
        setError("That invite code isn't valid or has expired.");
        setLoading(false);
        return;
      }
    }
    const redirectUrl = pendingJoinCode ? `${window.location.origin}/?join=${pendingJoinCode}` : window.location.origin;
    const { error: signInErr } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl } });
    if (signInErr) setError(signInErr.message);
    else setSent(true);
    setLoading(false);
  }

  async function handleRequestAccess() {
    setError("");
    if (!email) { setError("Enter your email first."); return; }
    const { error: reqErr } = await supabase.from("access_requests").insert({ email, name: "", reason: "Requested via app" });
    if (reqErr) setError(reqErr.message);
    else setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Watermark c={c} /></div>
        <h1 style={{ color: c.text, fontFamily: "Georgia, serif", fontSize: 26, marginBottom: 6 }}>Pocket Watch</h1>
        <p style={{ color: c.subtext, fontSize: 14, marginBottom: 26 }}>An invite-only circle. All the time in the world for the people who matter.</p>
        {pendingJoinCode && <div style={{ color: c.forest, fontSize: 13, marginBottom: 16 }}>You've got a Circle invite waiting — sign in first, then it'll join automatically.</div>}
        {sent ? (
          <div style={{ color: c.forest, fontSize: 15 }}>Check your email — we sent you a link to finish signing in.</div>
        ) : (
          <form onSubmit={handleSend}>
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle(c)} />
            <input type="text" placeholder="Invite code (leave blank to request access)" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} style={inputStyle(c)} />
            {error && <div style={{ color: "#B0524D", fontSize: 13, marginBottom: 10 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btnStyle(c), width: "100%", marginBottom: 10 }}>{loading ? "Sending..." : "Send me a sign-in link"}</button>
            <button type="button" onClick={handleRequestAccess} style={{ ...ghostBtnStyle(c), width: "100%" }}>No invite code? Request access instead</button>
          </form>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, c, currentUserId }) {
  const [liked, setLiked] = useState(post.userLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  async function toggleLike() {
    if (liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      setLiked(false); setLikeCount((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: currentUserId });
      setLiked(true); setLikeCount((n) => n + 1);
    }
  }

  async function loadComments() {
    const { data } = await supabase.from("comments").select("*, profiles(display_name, username)").eq("post_id", post.id).order("created_at", { ascending: true });
    setComments(data || []);
  }

  async function toggleComments() {
    if (!showComments) await loadComments();
    setShowComments(!showComments);
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    const { error } = await supabase.from("comments").insert({ post_id: post.id, author_id: currentUserId, content: newComment.trim() });
    if (error) { alert("Comment failed: " + error.message); return; }
    setNewComment("");
    loadComments();
  }

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {post.profiles?.avatar_url ? (
          <img src={post.profiles.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.brass, display: "flex", alignItems: "center", justifyContent: "center", color: c.card, fontWeight: 600 }}>
            {post.profiles?.display_name?.[0] || "?"}
          </div>
        )}
        <div>
          <div style={{ color: c.text, fontWeight: 600, fontSize: 14 }}>{post.profiles?.display_name || post.profiles?.username}</div>
          <div style={{ color: c.subtext, fontSize: 12 }}>{new Date(post.created_at).toLocaleString()} {post.circles?.name ? `· ${post.circles.name}` : "· Everyone"}</div>
        </div>
      </div>
      {post.content && <p style={{ color: c.text, fontSize: 15, lineHeight: 1.5, margin: "0 0 10px 0" }}>{post.content}</p>}
      {post.post_type === "photo" && post.media_url && <img src={post.media_url} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 10, display: "block" }} />}
      {post.post_type === "video" && post.media_url && <video src={post.media_url} controls style={{ width: "100%", borderRadius: 10, marginBottom: 10 }} />}
      <div style={{ display: "flex", gap: 18, color: c.subtext, fontSize: 13, alignItems: "center" }}>
        <button onClick={toggleLike} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: liked ? c.brassDeep : c.subtext, padding: 0 }}>
          <Heart size={16} fill={liked ? c.brassDeep : "none"} /> {likeCount}
        </button>
        <button onClick={toggleComments} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: c.subtext, padding: 0 }}>
          <MessageCircle size={16} /> {comments.length || post.commentCount || ""}
        </button>
      </div>
      {showComments && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${c.border}`, paddingTop: 10 }}>
          {comments.map((cm) => (
            <div key={cm.id} style={{ marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: c.text, fontWeight: 700 }}>{cm.profiles?.display_name || cm.profiles?.username}: </span>
              <span style={{ color: c.subtext }}>{cm.content}</span>
            </div>
          ))}
          <form onSubmit={submitComment} style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." style={{ ...inputStyle(c), marginBottom: 0, flex: 1 }} />
            <button type="submit" style={btnStyle(c)}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("feed");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [circles, setCircles] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [postCircleId, setPostCircleId] = useState("");
  const [pendingMedia, setPendingMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: "", bio: "" });
  const [newCircleName, setNewCircleName] = useState("");
  const [pendingJoinCode, setPendingJoinCode] = useState(null);

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const c = dark ? theme.dark : theme.light;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode) setPendingJoinCode(joinCode);
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadProfile();
      loadCircles();
      loadPosts();
      loadReels();
      if (pendingJoinCode) joinCircleByCode(pendingJoinCode);
    }
  }, [session]);

  async function loadProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(data);
    setProfileForm({ display_name: data?.display_name || "", bio: data?.bio || "" });
  }

  async function loadCircles() {
    const { data, error } = await supabase.from("circle_members").select("circle_id, role, circles(id, name, created_by)").eq("user_id", session.user.id);
    if (error) { console.error("loadCircles error:", error); return; }
    setCircles((data || []).map((m) => m.circles).filter(Boolean));
  }

  async function joinCircleByCode(code) {
    const { data: invite } = await supabase.from("circle_invites").select("*").eq("code", code).single();
    if (!invite) return;
    await supabase.from("circle_members").insert({ circle_id: invite.circle_id, user_id: session.user.id, role: "member" });
    loadCircles();
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(username, display_name, avatar_url), circles(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) { console.error("loadPosts error:", error); setPosts([]); return; }
    if (!data) { setPosts([]); return; }

    const postIds = data.map((p) => p.id);
    let likedSet = new Set();
    let likeCounts = {};
    if (postIds.length > 0) {
      const { data: myLikes } = await supabase.from("likes").select("post_id").eq("user_id", session.user.id).in("post_id", postIds);
      likedSet = new Set((myLikes || []).map((l) => l.post_id));
      const { data: allLikes } = await supabase.from("likes").select("post_id").in("post_id", postIds);
      (allLikes || []).forEach((l) => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });
    }
    setPosts(data.map((p) => ({ ...p, userLiked: likedSet.has(p.id), likeCount: likeCounts[p.id] || 0 })));
  }

  async function loadReels() {
    const { data } = await supabase.from("reels").select("*, profiles(username, display_name)").order("created_at", { ascending: false }).limit(30);
    setReels(data || []);
  }

  function handlePickMedia(file, type) {
    if (!file) return;
    setPendingMedia({ file, type, previewUrl: URL.createObjectURL(file) });
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!newPost.trim() && !pendingMedia) return;
    setUploading(true);

    let mediaUrl = null;
    let postType = "text";

    if (pendingMedia) {
      postType = pendingMedia.type;
      const bucket = pendingMedia.type === "photo" ? "photos" : "videos";
      const path = `${session.user.id}/${Date.now()}-${pendingMedia.file.name}`;
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, pendingMedia.file);
      if (uploadErr) {
        alert("Media upload failed: " + uploadErr.message);
        setUploading(false);
        return;
      }
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      mediaUrl = pub.publicUrl;
    }

    const { error: postErr } = await supabase.from("posts").insert({
      author_id: session.user.id,
      post_type: postType,
      content: newPost.trim() || null,
      media_url: mediaUrl,
      circle_id: postCircleId || null,
    });

    if (postErr) {
      alert("Post failed: " + postErr.message);
      setUploading(false);
      return;
    }

    setNewPost("");
    setPendingMedia(null);
    setUploading(false);
    loadPosts();
  }

  async function handleAvatarUpload(file) {
    if (!file) return;
    const path = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file);
    if (uploadErr) {
      alert("Avatar upload failed: " + uploadErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", session.user.id);
    if (updateErr) {
      alert("Saving avatar to profile failed: " + updateErr.message);
      return;
    }
    loadProfile();
  }

  async function saveProfile(e) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ display_name: profileForm.display_name, bio: profileForm.bio }).eq("id", session.user.id);
    if (error) { alert("Save failed: " + error.message); return; }
    setEditingProfile(false);
    loadProfile();
  }

  async function createCircle(e) {
    e.preventDefault();
    if (!newCircleName.trim()) return;
    const { data: circle, error: circleErr } = await supabase.from("circles").insert({ name: newCircleName.trim(), created_by: session.user.id }).select().single();
    if (circleErr) {
      alert("Creating Circle failed: " + circleErr.message);
      return;
    }
    const { error: memberErr } = await supabase.from("circle_members").insert({ circle_id: circle.id, user_id: session.user.id, role: "owner" });
    if (memberErr) {
      alert("Circle created but joining it failed: " + memberErr.message);
      return;
    }
    setNewCircleName("");
    loadCircles();
  }

  async function getOrCreateInviteLink(circleId) {
    const { data: existing } = await supabase.from("circle_invites").select("*").eq("circle_id", circleId).eq("created_by", session.user.id).limit(1).single();
    let code = existing?.code;
    if (!code) {
      const { data: created, error } = await supabase.from("circle_invites").insert({ circle_id: circleId, created_by: session.user.id }).select().single();
      if (error) { alert("Creating invite link failed: " + error.message); return; }
      code = created?.code;
    }
    const link = `${window.location.origin}/?join=${code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      alert("Invite link copied: " + link);
    } else {
      prompt("Copy this invite link:", link);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) return <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", color: c.text }}>Loading...</div>;
  if (!session) return <LoginScreen c={c} pendingJoinCode={pendingJoinCode} />;

  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: "'Iowan Old Style', Georgia, serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${c.border}`, position: "sticky", top: 0, background: c.bg, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Watermark c={c} />
          <span style={{ color: c.text, fontWeight: 700, fontSize: 18 }}>Pocket Watch</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDark(!dark)} style={{ background: "none", border: `1px solid ${c.border}`, borderRadius: 20, padding: "6px 10px", color: c.text, cursor: "pointer" }}>{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button onClick={handleSignOut} style={{ background: "none", border: `1px solid ${c.border}`, borderRadius: 20, padding: "6px 10px", color: c.text, cursor: "pointer" }}><LogOut size={15} /></button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "18px 14px 90px 14px" }}>
        {tab === "feed" && (
          <>
            <form onSubmit={handleCreatePost} style={{ marginBottom: 16 }}>
              <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Share something with your circle..." style={{ ...inputStyle(c), minHeight: 60, resize: "none" }} />
              {pendingMedia && (
                <div style={{ position: "relative", marginBottom: 10 }}>
                  {pendingMedia.type === "photo" ? (
                    <img src={pendingMedia.previewUrl} alt="" style={{ width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover" }} />
                  ) : (
                    <video src={pendingMedia.previewUrl} style={{ width: "100%", borderRadius: 10, maxHeight: 200 }} controls />
                  )}
                  <button type="button" onClick={() => setPendingMedia(null)} style={{ position: "absolute", top: 6, right: 6, background: c.card, border: `1px solid ${c.border}`, borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}><X size={14} color={c.text} /></button>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => photoInputRef.current?.click()} style={ghostBtnStyle(c)}><ImageIcon size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Photo</button>
                <button type="button" onClick={() => videoInputRef.current?.click()} style={ghostBtnStyle(c)}><Video size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Video</button>
                <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(e) => handlePickMedia(e.target.files[0], "photo")} />
                <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => handlePickMedia(e.target.files[0], "video")} />
                <select value={postCircleId} onChange={(e) => setPostCircleId(e.target.value)} style={{ ...inputStyle(c), width: "auto", marginBottom: 0, padding: "8px 10px", fontSize: 13 }}>
                  <option value="">Everyone</option>
                  {circles.map((circ) => <option key={circ.id} value={circ.id}>{circ.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={uploading} style={btnStyle(c)}>{uploading ? "Posting..." : "Post"}</button>
            </form>
            {posts.length === 0 && <div style={{ color: c.subtext, textAlign: "center", padding: 30, fontSize: 14 }}>No posts yet. Be the first to share something.</div>}
            {posts.map((post) => <PostCard key={post.id} post={post} c={c} currentUserId={session.user.id} />)}
          </>
        )}

        {tab === "reels" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {reels.length === 0 && <div style={{ gridColumn: "1 / -1", color: c.subtext, textAlign: "center", padding: 30, fontSize: 14 }}>No reels yet.</div>}
            {reels.map((r) => (
              <div key={r.id} style={{ aspectRatio: "9/16", borderRadius: 14, background: `linear-gradient(160deg, ${c.forest}55, ${c.brassDeep}55)`, border: `1px solid ${c.border}`, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 10 }}>
                <div style={{ color: c.text, fontSize: 12, fontWeight: 700 }}>{r.profiles?.display_name}</div>
                <div style={{ color: c.text, fontSize: 11, opacity: 0.85 }}>{r.caption}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "circles" && (
          <div>
            <form onSubmit={createCircle} style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input value={newCircleName} onChange={(e) => setNewCircleName(e.target.value)} placeholder="New Circle name (e.g. Family)" style={{ ...inputStyle(c), marginBottom: 0, flex: 1 }} />
              <button type="submit" style={btnStyle(c)}><Plus size={16} /></button>
            </form>
            {circles.length === 0 && <div style={{ color: c.subtext, textAlign: "center", padding: 20, fontSize: 14 }}>No Circles yet. Create one above.</div>}
            {circles.map((circ) => (
              <div key={circ.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: c.text, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><Users size={16} color={c.brass} /> {circ.name}</div>
                <button onClick={() => getOrCreateInviteLink(circ.id)} style={ghostBtnStyle(c)}><LinkIcon size={13} style={{ verticalAlign: "middle", marginRight: 4 }} /> Invite link</button>
              </div>
            ))}
          </div>
        )}

        {tab === "profile" && profile && (
          <div style={{ textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: 78, height: 78, borderRadius: "50%", objectFit: "cover", margin: "10px auto 12px auto", display: "block" }} />
              ) : (
                <div style={{ width: 78, height: 78, borderRadius: "50%", background: c.brass, margin: "10px auto 12px auto", display: "flex", alignItems: "center", justifyContent: "center", color: c.card, fontSize: 28, fontWeight: 700 }}>{profile.display_name?.[0] || "?"}</div>
              )}
              <button onClick={() => avatarInputRef.current?.click()} style={{ position: "absolute", bottom: 8, right: -4, background: c.brass, border: `2px solid ${c.bg}`, borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Camera size={14} color={c.card} /></button>
              <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={(e) => handleAvatarUpload(e.target.files[0])} />
            </div>
            {!editingProfile ? (
              <>
                <div style={{ color: c.text, fontWeight: 700, fontSize: 18 }}>{profile.display_name}</div>
                <div style={{ color: c.subtext, fontSize: 13 }}>@{profile.username}</div>
                {profile.bio && <div style={{ color: c.text, fontSize: 14, marginTop: 8, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>{profile.bio}</div>}
                <button onClick={() => setEditingProfile(true)} style={{ ...ghostBtnStyle(c), marginTop: 14 }}>Edit profile</button>
              </>
            ) : (
              <form onSubmit={saveProfile} style={{ textAlign: "left", maxWidth: 320, margin: "0 auto" }}>
                <label style={{ color: c.subtext, fontSize: 12 }}>Display name</label>
                <input value={profileForm.display_name} onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })} style={inputStyle(c)} />
                <label style={{ color: c.subtext, fontSize: 12 }}>Bio</label>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} style={{ ...inputStyle(c), minHeight: 60, resize: "none" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" style={btnStyle(c)}>Save</button>
                  <button type="button" onClick={() => setEditingProfile(false)} style={ghostBtnStyle(c)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: c.card, borderTop: `1px solid ${c.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px 0" }}>
        {[
          { key: "feed", icon: Home, label: "Feed" },
          { key: "reels", icon: Film, label: "Reels" },
          { key: "circles", icon: Users, label: "Circles" },
          { key: "profile", icon: User, label: "Profile" },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === key ? c.brass : c.subtext, cursor: "pointer", fontSize: 11 }}>
            <Icon size={20} />{label}
          </button>
        ))}
      </div>
    </div>
  );
                                }
