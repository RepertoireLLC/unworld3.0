import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

async function readSource(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const content = await readFile(absolutePath, 'utf8');
  return content.replace(/\r\n/g, '\n');
}

test('Harmonia experience exposes coordinated UI and store pathways', async () => {
  const appContent = await readSource('src/App.tsx');
  assert.match(appContent, /<AuthModal \/>/, 'App should surface the authentication modal for guests');
  assert.match(appContent, /<HeaderBar \/>/, 'Authenticated layout should include the header bar');
  assert.match(appContent, /<ControlPanel \/>/, 'Control panel must mount inside the main workspace grid');
  assert.match(appContent, /<HarmoniaCentralPanel \/>/, 'Central panel should render the core workspace tabs');
  assert.match(appContent, /<FieldNotesPanel \/>/, 'Field notes panel should remain part of the authenticated layout');
  assert.match(appContent, /<AIIntegrationPanel \/>/, 'AI integration surface should be mounted at the root level');
  assert.match(appContent, /<ToastStack \/>/, 'Toast stack should persist globally for feedback');
  assert.match(appContent, /<SettingsModal \/>/, 'Settings modal should be accessible from the root shell');

  const loginForm = await readSource('src/components/auth/LoginForm.tsx');
  assert.match(loginForm, /placeholder="Email"/, 'Login form should request an email address');
  assert.match(loginForm, /placeholder="Password"/, 'Login form should request a password');
  assert.match(loginForm, />\s*Sign In\s*<\//, 'Login form should expose a sign-in action');
  assert.match(loginForm, />\s*Sign up\s*<\//, 'Login form should link to registration for new operators');

  const registerForm = await readSource('src/components/auth/RegisterForm.tsx');
  assert.match(registerForm, /placeholder="Confirm Password"/, 'Registration form should confirm passwords');
  assert.match(registerForm, /type="color"/, 'Registration form should include a node color picker');
  assert.match(registerForm, />\s*Sign Up\s*<\//, 'Registration form should expose a sign-up action');

  const headerBar = await readSource('src/components/interface/HeaderBar.tsx');
  assert.match(headerBar, /SearchBar/, 'Header should wire the search bar component');
  assert.match(headerBar, /FriendRequests/, 'Header should surface friend request controls');
  assert.match(headerBar, /ThemeSelector/, 'Header should expose theme selector access');
  assert.match(headerBar, /ProfileIcon/, 'Header should display the operator profile icon');

  const controlPanel = await readSource('src/components/interface/ControlPanel.tsx');
  assert.match(controlPanel, /Scene variant="embedded"/, 'Control panel should embed a sphere scene preview');
  assert.match(controlPanel, /Expand sphere/, 'Control panel should allow expanding the sphere view');
  assert.match(controlPanel, /Active Nodes/, 'Control panel should highlight active node counts');
  assert.match(controlPanel, /Standby/, 'Control panel should track offline operator counts');
  assert.match(controlPanel, /Linked Channels/, 'Control panel should list linked operator channels');
  assert.match(controlPanel, /Profile/, 'Control panel should open dossiers for selected operators');
  assert.match(controlPanel, /Link/, 'Control panel should offer chat links to operators');

  const centralPanel = await readSource('src/components/interface/HarmoniaCentralPanel.tsx');
  assert.match(centralPanel, /Quantum Broadcast/, 'Central panel should label the broadcast workspace');
  assert.match(centralPanel, /Harmonia Agora/, 'Central panel should expose the agora workspace');
  assert.match(centralPanel, /WorkspaceTabs/, 'Central panel should hydrate workspace tabs for threads');

  const fieldNotes = await readSource('src/components/interface/FieldNotesPanel.tsx');
  assert.match(fieldNotes, /Secure Notepad/, 'Field notes panel should surface the secure drafting area');
  assert.match(fieldNotes, /Save Log/, 'Field notes panel should allow storing annotations');

  const searchBar = await readSource('src/components/SearchBar.tsx');
  assert.match(searchBar, /placeholder="Search users\.\.\."/, 'Search bar should include a descriptive placeholder');
  assert.match(searchBar, /setProfileUserId/, 'Search results should open profile dossiers on selection');

  const profileModal = await readSource('src/components/profile/ProfileModal.tsx');
  assert.match(profileModal, /Add Friend/, 'Profile modal should allow sending friend requests');
  assert.match(profileModal, /Message/, 'Profile modal should provide a direct message action');
  assert.match(profileModal, /InterestVectorEditor/, 'Profile modal should embed interest vector editing for self');

  const chatWindow = await readSource('src/components/chat/ChatWindow.tsx');
  assert.match(chatWindow, /placeholder="Type a message\.\.\."/, 'Chat window should provide message input guidance');
  assert.match(chatWindow, /sendMessage\(currentUser.id, userId, message.trim\(\)\)/, 'Chat window should dispatch outbound messages through the chat store');

  const themeSelector = await readSource('src/components/ThemeSelector.tsx');
  assert.match(themeSelector, /System Themes/, 'Theme selector should enumerate built-in themes');
  assert.match(themeSelector, /Change Node Color/, 'Theme selector should expose node color customization');
  assert.match(themeSelector, /Theme Studio/, 'Theme selector should deep link to the theme studio settings');

  const aiPanel = await readSource('src/components/ai/AIIntegrationPanel.tsx');
  assert.match(aiPanel, /Universal AI Integration/, 'AI integration panel should frame the universal integration header');
  assert.match(aiPanel, /testConnection/, 'AI integration panel should trigger connection tests');
  assert.match(aiPanel, /ToggleLeft/, 'AI integration panel should surface enable toggles for routes');

  const aiStore = await readSource('src/store/aiStore.ts');
  assert.match(aiStore, /retrieveAIConnections/, 'AI store should hydrate encrypted connections from storage');
  assert.match(aiStore, /testAIConnection\(connection\)/, 'AI store should delegate tests through the router');
  assert.match(aiStore, /persistAIConnections\(get\(\).connections, get\(\).activeConnectionId\)/, 'AI store should persist connection state after mutations');

  const authStore = await readSource('src/store/authStore.ts');
  assert.match(authStore, /setOnlineStatus\(newUser.id, true\)/, 'Registration should mark the new operator online');
  assert.match(authStore, /setOnlineStatus\(user.id, true\)/, 'Login should re-hydrate the operator presence state');
  assert.match(authStore, /updateProfile/, 'Auth store should expose profile update capabilities');

  const friendStore = await readSource('src/store/friendStore.ts');
  assert.match(friendStore, /status: 'pending'/, 'Friend store should enqueue pending requests');
  assert.match(friendStore, /request.status === 'accepted'/, 'Friend store should track accepted relationships');

  const chatStore = await readSource('src/store/chatStore.ts');
  assert.match(chatStore, /useMemoryStore.getState\(\).appendMessage/, 'Chat store should archive conversations into the memory store');
  assert.match(chatStore, /dispatchConsciousEvent\({\s*type: 'resonance:pulse'/, 'Chat store should broadcast resonance pulses for each message');

  const forumStore = await readSource('src/store/forumStore.ts');
  assert.match(forumStore, /BroadcastChannel/, 'Forum store should attempt BroadcastChannel synchronization');
  assert.match(forumStore, /window.localStorage.setItem\(STORAGE_SYNC_KEY, envelope\)/, 'Forum store should fall back to local storage sync for posts');
  assert.match(forumStore, /recordEngagement/, 'Forum store should record engagement telemetry');

  const scene = await readSource('src/components/Scene.tsx');
  assert.match(scene, /<Canvas/, '3D scene should render through react-three-fiber Canvas');
  assert.match(scene, /<Sphere \/>/, 'Scene should include the Harmonia sphere mesh');
  assert.match(scene, /<UserNodes \/>/, 'Scene should map user nodes into the 3D environment');
  assert.match(scene, /<OrbitControls/, 'Scene should expose orbit controls for navigation');

  const toastStack = await readSource('src/components/interface/ToastStack.tsx');
  assert.match(toastStack, /setTimeout\(\(\) => removeToast\(toast.id\), duration\)/, 'Toast stack should auto-dismiss notifications after a timeout');

  const settingsModal = await readSource('src/components/interface/SettingsModal.tsx');
  assert.match(settingsModal, /Harmonia Settings/, 'Settings modal should surface the Harmonia settings header');
  assert.match(settingsModal, /Chrono Alignment/, 'Settings modal should expose timezone alignment controls');
  assert.match(settingsModal, /Mesh Governance/, 'Settings modal should surface mesh governance controls');
});
