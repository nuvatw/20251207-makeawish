// 1. Supabase config (YOUR real values)
const SUPABASE_URL = "https://ggngkbgqupecnrfhqpyr.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_yjkEM-3_qECtrdRb0rEucQ_q-ODnLA5";

// 2. Create the client using the global "supabase" from the CDN
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Grab DOM elements
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const welcomeText = document.getElementById("welcome-text");

const form = document.getElementById("wish-form");
const wishInput = document.getElementById("wish-input");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status " + (type || "");
}

// 4. Update UI based on whether the user is logged in
async function refreshAuthUI() {
  try {
    const { data, error } = await db.auth.getSession();
    if (error) {
      console.error(error);
      welcomeText.textContent = "Error checking session.";
      loginButton.style.display = "inline-block";
      logoutButton.style.display = "none";
      form.style.display = "none";
      return;
    }

    const session = data?.session;
    const user = session?.user;

    if (user) {
      welcomeText.textContent = "Hello, " + (user.email || "friend") + "!";
      loginButton.style.display = "none";
      logoutButton.style.display = "inline-block";
      form.style.display = "block";
    } else {
      welcomeText.textContent = "You are not signed in.";
      loginButton.style.display = "inline-block";
      logoutButton.style.display = "none";
      form.style.display = "none";
    }
  } catch (err) {
    console.error(err);
    welcomeText.textContent = "Error checking session.";
    loginButton.style.display = "inline-block";
    logoutButton.style.display = "none";
    form.style.display = "none";
  }
}

// 5. Log in with Google
loginButton.addEventListener("click", async () => {
  try {
    await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin, // e.g. http://localhost:5500
      },
    });
    // Supabase will redirect to Google, then back to this page
  } catch (err) {
    console.error(err);
    setStatus("Could not start Google sign-in.", "error");
  }
});

// 6. Log out
logoutButton.addEventListener("click", async () => {
  try {
    await db.auth.signOut();
    await refreshAuthUI();
  } catch (err) {
    console.error(err);
  }
});

// 7. Submit a wish (only if logged in)
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const wish = wishInput.value.trim();
  if (!wish) {
    setStatus("Please type a wish first 😊", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Sending your wish...", "");

  try {
    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser();

    if (userError || !user) {
      console.error(userError);
      setStatus("You must be signed in to send a wish.", "error");
      submitBtn.disabled = false;
      return;
    }

    // Insert wish with user info
    const { error } = await db
      .from("wishes")
      .insert(
        [
          {
            wish: wish,
            user_id: user.id,
            user_email: user.email,
          },
        ],
        { returning: "minimal" }
      );

    if (error) {
      console.error(error);
      setStatus("Oops, could not send your wish.", "error");
    } else {
      setStatus("Wish sent! ✨", "success");
      wishInput.value = "";
    }
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong. Check the console.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// 8. Run on page load
document.addEventListener("DOMContentLoaded", () => {
  refreshAuthUI();

  // Optional: listen for auth state changes as well
  db.auth.onAuthStateChange((_event, _session) => {
    refreshAuthUI();
  });
});
