import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { Clock, Home, Film, User, Sun, Moon, Heart, MessageCircle, Plus, LogOut } from "lucide-react";

const theme = {
  light: {
    bg: "#F1E9D8", card: "#FBF6EC", text: "#3D2E22", subtext: "#7A6752",
    brass: "#B08D57", brassDeep: "#8C6D3F", forest: "#3F5B44", border: "#E0D3B8",
  },
  dark: {
    bg: "#1C1815", card: "#26201B", text: "#E8DCC5", subtext: "#A69880",
    brass: "#C9A464", brassDeep: "#DDB876", forest: "#6E9478", border: "#3A322A",
  },
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

function LoginScreen({ c }) {
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
        .from("invites")
        .select("*")
        .eq("code", inviteCode.trim())
        .is("used_by", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteErr || !invite) {
        setError("That invite code isn't valid or has expired.");
        setLoading(false);
        return;
      }
    }

    const { error: signInErr } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (signInErr) {
      setError(signInErr.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleRequestAccess() {
    setError("");
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    const { error: reqErr } = await supabase
      .from("access_requests")
      .insert({ email, name: "", reason: "Requested via app" });

    if (reqErr) setError(reqErr.message);
    else setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <Watermark c={c} />
        </div>
        <h1 style={{ color: c.text, fontFamily: "Georgia, serif", fontSize: 26, marginBottom: 6 }}>Pocket Watch</h1>
        <p style={{ color: c.subtext, fontSize: 14, marginBottom: 26 }}>
          An invite-only circle. All the time in the world for the people who matter.
        </p>

        {sent ? (
          <div style={{ color: c.forest, fontSize: 15 }}>
            Check your email — we sent you a link to finish signing in.
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10, marginBottom: 10,
                border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 15,
              }}
            />
            <input
              type="text"
              placeholder="Invite code (leave blank to request access)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10, marginBottom: 14,
                border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 15,
              }}
            />
            {error && <div style={{ color: "#B0524D", fontSize: 13, marginBottom: 10 }}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: c.brass, color: c.card, fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10,
              }}
            >
              {loading ? "Sending..." : "Send me a sign-in link"}
            </button>
            <button
              type="button"
              onClick={handleRequestAccess}
              style={{
                width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${c.border}`,
                background: "none", color: c.subtext, fontSize: 13, cursor: "pointer",
              }}
            >
              No invite code? Request access instead
            </button>
          </form>
        )}
      </div>
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
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const c = dark ? theme.dark : theme.light;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadProfile();
      loadPosts();
      loadReels();
    }
  }, [session]);

  async function loadProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(data);
  }

  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts(data || []);
  }

  async function loadReels() {
    const { data } = await supabase
      .from("reels")
      .select("*, profiles(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(30);
    setReels(data || []);
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!newPost.trim()) return;
    const { error } = await supabase.from("posts").insert({
      author_id: session.user.id,
      post_type: "text",
      content: newPost.trim(),
    });
    if (!error) {
      setNewPost("");
      loadPosts();
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", color: c.text }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen c={c} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: "'Iowan Old Style', Georgia, serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${c.border}`, position: "sticky", top: 0, background: c.bg, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Watermark c={c} />
          <span style={{ color: c.text, fontWeight: 700, fontSize: 18 }}>Pocket Watch</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDark(!dark)} style={{ background: "none", border: `1px solid ${c.border}`, borderRadius: 20, padding: "6px 10px", color: c.text, cursor: "pointer" }}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button onClick={handleSignOut} style={{ background: "none", border: `1px solid ${c.border}`, borderRadius: 20, padding: "6px 10px", color: c.text, cursor: "pointer" }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "18px 14px 90px 14px" }}>
        {tab === "feed" && (
          <>
            <form onSubmit={handleCreatePost} style={{ marginBottom: 16 }}>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share something with your circle..."
                style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 14, resize: "none", minHeight: 60, fontFamily: "inherit" }}
              />
              <button type="submit" style={{ marginTop: 8, padding: "8px 16px", borderRadius: 10, border: "none", background: c.brass, color: c.card, fontWeight: 700, cursor: "pointer" }}>
                Post
              </button>
            </form>

            {posts.length === 0 && (
              <div style={{ color: c.subtext, textAlign: "center", padding: 30, fontSize: 14 }}>
                No posts yet. Be the first to share something.
              </div>
            )}

            {posts.map((post) => (
              <div key={post.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.brass, display: "flex", alignItems: "center", justifyContent: "center", color: c.card, fontWeight: 600 }}>
                    {post.profiles?.display_name?.[0] || "?"}
                  </div>
                  <div>
                    <div style={{ color: c.text, fontWeight: 600, fontSize: 14 }}>{post.profiles?.display_name || post.profiles?.username}</div>
                    <div style={{ color: c.subtext, fontSize: 12 }}>{new Date(post.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <p style={{ color: c.text, fontSize: 15, lineHeight: 1.5, margin: 0 }}>{post.content}</p>
              </div>
            ))}
          </>
        )}

        {tab === "reels" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {reels.length === 0 && (
              <div style={{ gridColumn: "1 / -1", color: c.subtext, textAlign: "center", padding: 30, fontSize: 14 }}>
                No reels yet.
              </div>
            )}
            {reels.map((r) => (
              <div key={r.id} style={{ aspectRatio: "9/16", borderRadius: 14, background: `linear-gradient(160deg, ${c.forest}55, ${c.brassDeep}55)`, border: `1px solid ${c.border}`, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 10 }}>
                <div style={{ color: c.text, fontSize: 12, fontWeight: 700 }}>{r.profiles?.display_name}</div>
                <div style={{ color: c.text, fontSize: 11, opacity: 0.85 }}>{r.caption}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "profile" && profile && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 78, height: 78, borderRadius: "50%", background: c.brass, margin: "10px auto 12px auto", display: "flex", alignItems: "center", justifyContent: "center", color: c.card, fontSize: 28, fontWeight: 700 }}>
              {profile.display_name?.[0] || "?"}
            </div>
            <div style={{ color: c.text, fontWeight: 700, fontSize: 18 }}>{profile.display_name}</div>
            <div style={{ color: c.subtext, fontSize: 13 }}>@{profile.username}</div>
            <div style={{ color: c.subtext, fontSize: 13, marginTop: 4 }}>{profile.is_private ? "Private profile" : "Public profile"}</div>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: c.card, borderTop: `1px solid ${c.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px 0" }}>
        {[
          { key: "feed", icon: Home, label: "Feed" },
          { key: "reels", icon: Film, label: "Reels" },
          { key: "profile", icon: User, label: "Profile" },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === key ? c.brass : c.subtext, cursor: "pointer", fontSize: 11 }}>
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
              }
