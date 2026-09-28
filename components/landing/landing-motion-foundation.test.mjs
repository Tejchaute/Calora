import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [motion, scene, hero, page, showcase, product, footer] = await Promise.all([
  read('./LandingMotion.tsx'),
  read('./HeroAtmosphere3D.tsx'),
  read('./HeroSection.tsx'),
  read('../landing-page.tsx'),
  read('./FeatureShowcase.tsx'),
  read('./ProblemSection.tsx'),
  read('./LandingFooter.tsx'),
]);

test('landing uses the existing motion dependency for reusable reveals', () => {
  assert.match(motion, /from 'motion\/react'/);
  assert.match(motion, /export function Reveal/);
  assert.match(motion, /export function RevealGroup/);
  assert.match(motion, /staggerChildren/);
});

test('section reveals are viewport-bounded and run only once', () => {
  assert.match(motion, /whileInView/);
  assert.match(motion, /once: true/);
  assert.match(motion, /amount: 0\.12/);
});

test('reduced-motion preference removes movement and duration', () => {
  assert.match(motion, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(motion, /query\.matches \? 'reduced' : 'enabled'/);
  assert.match(motion, /if \(mode !== 'enabled'\) return <div/);
  assert.doesNotMatch(motion, /useReducedMotion/);
});

test('SSR and first client render start from the same visible pending state', () => {
  assert.match(motion, /useState<MotionMode>\('pending'\)/);
  assert.match(motion, /createContext<MotionMode>\('pending'\)/);
  assert.match(motion, /useEffect\(\(\) => \{[\s\S]*window\.matchMedia/);
  assert.doesNotMatch(motion, /suppressHydrationWarning/);
});

test('hero depth is attached to the existing product preview', () => {
  assert.match(hero, /<HeroDepth className="lg:col-span-7">/);
  assert.match(hero, /<BrowserChrome url="calora\.app\/book\/harbor-studio">/);
  assert.match(hero, /depth=\{72\}/);
  assert.match(hero, /depth=\{44\}/);
});

test('3D treatment stays lightweight and desktop-scoped', () => {
  assert.match(motion, /perspective:1400px/);
  assert.match(scene, /await import\('three'\)/);
  assert.match(scene, /min-width: 1024px/);
  assert.match(scene, /powerPreference: 'low-power'/);
  assert.match(scene, /setPixelRatio\(Math\.min\(window\.devicePixelRatio, 1\.35\)\)/);
  assert.doesNotMatch(scene, /postprocessing|TextureLoader|particles|physics/);
});

test('hero interaction is bounded and touch-safe', () => {
  assert.match(motion, /event\.pointerType !== 'mouse'/);
  assert.match(motion, /rawRotateX\.set\(-y \* 4\)/);
  assert.match(motion, /rawRotateY\.set\(x \* 6\)/);
  assert.match(motion, /rawRotateX\.set\(0\)/);
});

test('continuous motion and WebGL pause for reduced motion or offscreen content', () => {
  assert.match(motion, /y: \[0, -6, 0\]/);
  assert.match(scene, /prefers-reduced-motion: reduce/);
  assert.match(scene, /IntersectionObserver/);
  assert.match(scene, /cancelAnimationFrame/);
  assert.match(scene, /renderer\?\.dispose\(\)/);
});

test('native scrolling and approved anchors remain intact', () => {
  assert.doesNotMatch(page, /preventDefault|wheel|touchmove|scrollTo|Lenis/);
  assert.match(hero, /href="#booking-flow"/);
  assert.match(showcase, /id="booking-flow"/);
  assert.match(product, /id="product"/);
});

test('approved conversion routes remain unchanged', () => {
  assert.match(hero, /href="\/register"/);
  assert.match(footer, /href: '\/login'/);
  assert.match(footer, /href: '\/register'/);
});

test('motion implementation adds no fabricated product data or claims', () => {
  assert.doesNotMatch(motion, /customer|revenue|testimonial|analytics|appointment/i);
});
