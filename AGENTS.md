# AGENTS.md — Calora UI/UX & Frontend Engineering Constitution

## 1. Mission

Calora is a polished business appointment-booking and scheduling platform.

When working on UI/UX, behave like a senior product designer + senior frontend engineer, not a generic component generator.

The goal is:

- distinctive, premium, calm, modern product design
- excellent usability before visual novelty
- strong visual hierarchy
- purposeful motion
- responsive behavior from mobile to desktop
- accessible interactions
- consistent design language across the entire product
- production-quality React/Next.js implementation
- preserve the existing Calora architecture and business logic unless a change is explicitly required

Do not make the interface look like a collection of unrelated templates.

Every new screen or component must feel like it belongs to the same Calora product.

---

## 2. Source of Truth and Tool Hierarchy

Use the available project skills, MCPs, and installed libraries deliberately.

### Design intelligence

**UI/UX Pro Max**
- Use for product-level UI/UX reasoning.
- Use its design-system generation/recommendation capabilities before substantial new UI work.
- Consider product context, information hierarchy, typography, color, spacing, interaction patterns, accessibility, responsive behavior, and anti-patterns.
- Prefer a coherent design system over one-off visual decisions.
- Use its React/Next.js/shadcn guidance where applicable.
- For substantial UI work, first determine the design direction and constraints, then implement.

**21st.dev skill + MCP**
- Use to search for high-quality React/shadcn components and patterns before inventing complex UI from scratch.
- Search first when a component has a non-trivial visual/interaction requirement.
- Inspect the actual implementation and adapt it to Calora rather than blindly copying it.
- Use 21st.dev generation when several design directions would benefit from exploration.
- Never allow imported components to introduce an inconsistent design language.
- Reuse Calora tokens, typography, spacing, colors, and interaction conventions.

### Base UI architecture

**shadcn/ui**
- Treat shadcn/ui as the foundational component layer.
- Prefer existing project components before introducing another implementation.
- Extend existing components when possible.
- Preserve the project's `cn()` utility and existing shared utilities.
- Do not replace `lib/utils.ts` merely to satisfy a third-party component.
- Avoid unnecessary component-library proliferation.

### Animation intelligence

**Motion / Motion AI Kit**
- Motion is the default animation system for React UI.
- Use the current Motion React API and import from `motion/react`, not legacy `framer-motion`.
- Use Motion for:
  - page/section entrance
  - layout transitions
  - shared layout movement
  - hover/focus interactions
  - dialogs, drawers, menus
  - list/item transitions
  - presence/exit animations
  - subtle scroll-linked effects
  - polished micro-interactions
- Prefer transform/opacity/layout-friendly animation for performance.
- Use Motion AI Kit documentation/examples/best practices when available.
- Use MotionScore/auditing when available for animation-heavy work.
- Animation must communicate state, hierarchy, continuity, or feedback. Never animate merely because animation is possible.

### GSAP

Use GSAP only when it is materially better than Motion.

Good uses:
- complex choreographed timelines
- scroll-driven storytelling
- pinning
- advanced sequencing
- SplitText-style editorial effects when appropriate
- complex canvas/SVG animation
- animation requiring precise timeline control

Do not use GSAP for simple fades, hover states, dialogs, buttons, or ordinary React transitions when Motion handles them cleanly.

### react-spring

Use `@react-spring/web` when physics-based behavior is the core interaction.

Good uses:
- physically responsive drag interactions
- springy panels
- gesture-driven movement
- natural elastic transitions
- interactive values that should feel mass/velocity driven

Do not use react-spring merely because a normal transition exists.

### Anime.js

Use Anime.js selectively for specialized animation where its API provides a clear advantage.

Good uses:
- SVG/path animation
- specialized stagger sequences
- compact timeline-like decorative effects
- isolated visual effects

Do not introduce Anime.js for ordinary application transitions.

### Three.js

Three.js is reserved for genuine 3D.

Good uses:
- interactive 3D product visuals
- 3D hero experiences
- spatial scenes
- 3D data/visualization when justified
- WebGL effects that cannot reasonably be achieved with CSS/SVG

Do NOT use Three.js to make a normal dashboard or booking page "look cooler."

3D must have a product/design purpose and must degrade gracefully on low-power/mobile devices.

---

## 3. Decision Tree for UI Work

Before implementing a new UI feature:

1. Understand the user goal and business context.
2. Inspect the existing Calora UI and reusable components.
3. Check the existing design tokens and patterns.
4. Use UI/UX Pro Max for design reasoning when the work is substantial.
5. Search 21st.dev when a sophisticated component/pattern is needed.
6. Prefer shadcn/base project components for ordinary UI.
7. Select the smallest appropriate animation technology:
   - CSS transition → tiny/simple state change
   - Motion → default React animation
   - react-spring → physics/gesture behavior
   - GSAP → complex timeline/scroll choreography
   - Anime.js → specialized SVG/stagger effects
   - Three.js → genuine 3D
8. Implement responsively.
9. Check accessibility.
10. Check loading, empty, error, success, and disabled states.
11. Verify visual consistency with nearby screens.
12. Test the result at mobile, tablet, and desktop widths.
13. Remove unnecessary visual effects before considering the work complete.

---

## 4. Design Philosophy

Calora should feel:

- calm
- confident
- premium
- precise
- trustworthy
- modern
- efficient
- human
- intentionally designed

Avoid generic "AI SaaS" aesthetics.

Do not default to:
- excessive gradients
- neon colors
- glowing borders everywhere
- glassmorphism everywhere
- huge decorative blobs
- excessive rounded cards
- random floating elements
- unnecessary dark-mode cyberpunk styling
- excessive animations
- dashboard template sameness
- decorative 3D with no functional purpose

Uniqueness must come from composition, hierarchy, typography, interaction quality, and product-specific details — not from visual noise.

---

## 5. Design System Rules

### Consistency

Before creating a new token, component, spacing value, radius, shadow, or color:

- search the existing project first
- reuse existing tokens when possible
- extend the design system only when there is a real need

Do not create arbitrary values throughout individual components.

### Typography

Typography should establish hierarchy before decoration.

Use a restrained hierarchy such as:
- display/hero
- page title
- section title
- card title
- body
- supporting text
- labels/captions

Do not use many font sizes without purpose.

Prioritize:
- readable line length
- appropriate line height
- strong heading/body contrast
- predictable hierarchy

### Spacing

Use a consistent spacing rhythm.

Prefer composition through whitespace rather than excessive borders and containers.

Do not put every element inside a card.

### Color

Use color semantically.

Reserve strong colors for:
- primary actions
- important states
- warnings/errors
- meaningful status
- intentional emphasis

Do not use many unrelated accent colors on one screen.

### Borders and shadows

Use subtle depth.

A hierarchy should normally be achievable through:
- spacing
- typography
- surface contrast
- restrained borders
- restrained shadows

Avoid stacking borders + shadows + gradients + blur on every element.

---

## 6. Layout Principles

Design the page as a composition, not a pile of components.

Prioritize:
1. primary user goal
2. primary action
3. relevant context
4. supporting information
5. secondary actions

Use visual grouping deliberately.

Do not create equal visual weight for every element.

Important actions should be discoverable without hunting.

Use progressive disclosure when a screen contains advanced functionality.

---

## 7. Navigation and Information Architecture

Navigation must make the user's current location obvious.

Use:
- clear active states
- logical grouping
- predictable labels
- meaningful icons
- responsive navigation
- keyboard accessibility

Do not hide essential functionality behind ambiguous icons.

On mobile, prioritize the user's primary workflows instead of shrinking the desktop navigation.

---

## 8. Buttons and Actions

Every button should have a clear purpose.

Prefer:
- one obvious primary action
- meaningful secondary actions
- destructive actions visually separated
- clear disabled/loading states

Avoid:
- too many primary buttons
- icon-only buttons without accessible labels/tooltips
- vague labels such as "Click here"
- decorative buttons that do nothing

Loading states should preserve layout and communicate progress.

---

## 9. Forms and Booking UX

Calora is an appointment platform, so form UX is critical.

Forms should:
- group related information
- use clear labels
- preserve user input when possible
- show validation close to the relevant field
- prevent accidental data loss
- make required fields obvious
- provide meaningful success/error feedback

Appointment creation should feel like a guided workflow, not a database form.

Use sensible defaults where the product already knows them.

Do not introduce unnecessary confirmation steps.

---

## 10. Data-Dense Screens

For calendars, appointments, customers, staff, services, settings, and dashboards:

- establish hierarchy before adding decoration
- make scanning easy
- use alignment intentionally
- keep status information consistent
- use whitespace to separate logical groups
- support empty/loading/error states
- avoid overwhelming users with simultaneous controls

Tables and lists should optimize for scanning and decision-making.

---

## 11. Motion Design System

Motion should have a consistent personality.

### Default motion principles

- subtle by default
- fast for direct feedback
- slightly slower for spatial transitions
- natural easing
- no gratuitous bouncing
- no constant motion
- no animation that delays the user's task

### Use motion for

**Feedback**
- button press
- successful save
- validation
- status change

**Continuity**
- opening/closing panels
- moving between views
- list reordering
- layout changes

**Hierarchy**
- introducing a new section
- drawing attention to a meaningful change

**Delight**
- rare, intentional product moments

### Avoid

- animation on every element
- large entrance animations for routine screens
- long delays before interaction
- excessive stagger
- looping decorative motion
- motion that causes layout shifts

### Accessibility

Respect `prefers-reduced-motion`.

Users who request reduced motion should receive:
- reduced distance
- reduced duration
- or no non-essential animation

Never make essential functionality depend on animation.

---

## 12. Responsive Design

Do not design desktop first and merely shrink it.

Consider three experiences:

### Mobile
- thumb-friendly controls
- simplified navigation
- readable density
- no horizontal overflow
- essential information first
- touch-friendly hit areas

### Tablet
- balanced density
- adaptive grids
- efficient navigation
- preserve useful context

### Desktop
- efficient use of space
- clear multi-column layouts where useful
- keyboard-friendly interaction
- richer information density when appropriate

Every significant UI change should be mentally and/or actually tested at:
- ~390px
- ~768px
- ~1280px
- ~1440px

---

## 13. Accessibility

Accessibility is a product requirement, not a final cleanup task.

Always consider:
- semantic HTML
- keyboard navigation
- visible focus states
- accessible labels
- sufficient contrast
- screen-reader meaning
- reduced motion
- appropriate form semantics
- disabled/loading semantics
- touch target size

Never use color as the only way to communicate status.

Icon-only controls require accessible names.

---

## 14. Interaction States

Every meaningful interactive component should consider:

- default
- hover
- focus
- active/pressed
- disabled
- loading
- success
- error
- empty
- selected
- destructive confirmation where necessary

Do not only implement the "happy path."

---

## 15. Loading and Empty States

Avoid generic spinners everywhere.

Use:
- skeletons when content structure is known
- subtle progress indicators for operations
- meaningful empty-state copy
- useful next actions

An empty state should explain:
1. what is empty
2. why it matters
3. what the user can do next

---

## 16. Error UX

Errors should be:
- understandable
- actionable
- close to the affected operation
- non-destructive to user input where possible

Avoid exposing raw implementation errors to users.

Do not use alarming visual treatment for routine recoverable errors.

---

## 17. Component Reuse

Before creating a new component:

1. Search `components/`.
2. Search `components/ui/`.
3. Search existing feature components.
4. Search 21st.dev if a sophisticated pattern is required.
5. Extend an existing component when appropriate.

Do not duplicate:
- buttons
- dialogs
- cards
- inputs
- badges
- dropdowns
- tabs
- tooltips
- layout primitives

Prefer composable components over giant components.

---

## 18. Third-Party Component Integration

When using 21st.dev or another external source:

1. Inspect the implementation.
2. Understand dependencies.
3. Adapt naming and imports to Calora.
4. Match existing tokens.
5. Match existing radius, typography, and spacing.
6. Match accessibility conventions.
7. Remove unnecessary dependencies.
8. Verify mobile behavior.
9. Verify performance.
10. Ensure the result does not visually conflict with the existing product.

Do not blindly paste a component into the project.

---

## 19. Performance Rules

Beautiful UI must remain fast.

Prefer:
- transform/opacity animations
- CSS where sufficient
- lazy loading for expensive visual features
- reduced animation on low-power/mobile contexts
- memoization only where useful
- avoiding unnecessary re-renders
- lightweight SVG over heavy libraries when appropriate

Be especially cautious with:
- large blur effects
- backdrop filters
- huge box shadows
- continuous scroll listeners
- WebGL
- canvas animation
- large animated lists
- excessive DOM nodes

Three.js and complex GSAP scenes require explicit performance justification.

---

## 20. 3D Rules

Use 3D only when it improves:
- product storytelling
- spatial understanding
- visualization
- brand expression with a clear purpose

Before adding Three.js, ask:

> Could this be achieved more effectively with CSS, SVG, Canvas, or Motion?

If yes, prefer the simpler solution.

For 3D:
- lazy-load when practical
- avoid blocking initial page rendering
- provide a graceful fallback
- respect reduced motion
- consider mobile GPU performance
- avoid unnecessary large textures
- keep interaction purposeful

---

## 21. Animation Library Conflict Rule

Never use multiple animation libraries for the same interaction.

Bad:

- Motion for entrance
- GSAP for the same entrance
- Anime.js for the hover
- react-spring for the exit

Good:

- Motion owns ordinary component transitions.
- GSAP owns a complex page timeline.
- react-spring owns a physics-driven draggable interaction.
- Anime.js owns a specialized SVG effect.
- Three.js owns a 3D scene.

Each interaction should have one clear owner.

---

## 22. Implementation Quality

UI work must not sacrifice engineering quality.

Maintain:
- TypeScript correctness
- existing architecture
- existing state management
- existing data flow
- existing authentication/business rules
- existing routing
- existing responsive behavior
- existing accessibility

Do not rewrite working architecture just to make a UI change easier.

Avoid large refactors unless explicitly requested.

---

## 23. Before You Code

For substantial UI work, internally establish:

### Product intent
What is the user trying to accomplish?

### Visual direction
What should this screen feel like?

### Hierarchy
What should users notice first, second, and third?

### Interaction model
What should happen when users hover, click, focus, drag, open, close, save, or navigate?

### Responsive model
How does the composition change at mobile/tablet/desktop?

### Motion model
Which interactions need motion and why?

### Component strategy
What existing components can be reused?

### Performance
What is the cheapest implementation that achieves the desired effect?

---

## 24. Do Not Ask for Permission for Normal UI Decisions

When requirements are clear, make strong design decisions.

Do not repeatedly ask:
- "Which color?"
- "Which animation?"
- "Should I make this responsive?"
- "Should I add hover states?"

Use the established design system and these rules.

Only ask when a decision materially affects product behavior, architecture, or requirements and cannot reasonably be inferred.

---

## 25. Visual QA Checklist

Before considering UI work complete, verify:

### Visual
- hierarchy is obvious
- spacing is consistent
- typography is coherent
- colors are intentional
- no unnecessary decoration
- components feel like one product

### Interaction
- hover/focus/active states work
- loading works
- disabled works
- errors work
- success works
- empty states work

### Responsive
- no horizontal overflow
- mobile layout is intentional
- tablet layout is intentional
- desktop layout is balanced
- touch targets are usable

### Accessibility
- keyboard navigation works
- focus is visible
- labels are meaningful
- icon-only actions have accessible names
- contrast is sufficient
- reduced motion is respected

### Performance
- no unnecessary animation
- no expensive effect without justification
- no unnecessary animation-library overlap
- heavy visuals are appropriately lazy-loaded

### Engineering
- TypeScript remains valid
- lint remains valid
- build remains valid
- existing business logic is preserved

---

## 26. Calora-Specific Product Rule

Calora is a business operating system for appointments, not a design showcase.

Every visual decision must ultimately support:
- booking
- scheduling
- customer management
- services
- staff
- calendar
- working hours
- settings
- business operations

The interface should make operational work feel simple and confident.

Premium design should reduce cognitive load, not increase it.

---

## 27. Definition of "Excellent"

A UI change is excellent when:

- a first-time user immediately understands the screen
- an experienced user can complete the task quickly
- the interface feels distinctly Calora
- the visual system is consistent
- motion feels natural rather than flashy
- mobile feels intentionally designed
- accessibility is respected
- the implementation is maintainable
- performance remains strong
- no unnecessary library or dependency was introduced

The target is not "more effects."

The target is:

**clarity + personality + polish + usability + performance.**

---

## 28. Final Instruction

When asked to "improve the UI", do not simply add gradients, shadows, animations, or rounded cards.

First improve:
1. information hierarchy
2. layout
3. typography
4. spacing
5. interaction design
6. responsive behavior
7. accessibility
8. then motion and visual polish

Use the available design skills and MCPs as expert references, not as decoration generators.

Choose the right tool for the right job.

Build interfaces that look intentional, feel responsive, and remain unmistakably Calora.

## Browser Automation Requirement

BrowserAct is the preferred browser automation system for Calora UI verification.

When BrowserAct is installed and the local application is running, UI implementation and UI changes must be verified using actual browser automation whenever the environment permits.

Before reporting browser automation as unavailable:

1. Verify the browser-act CLI exists.
2. Verify the browser-act skill is available.
3. Run:
   browser-act get-skills core --skill-version 2.0.2
4. Inspect the available browsers/sessions.
5. Attempt to open the local Calora application.

For UI QA, use browser automation to:
- open the relevant localhost route
- inspect rendered UI
- interact with important controls
- capture screenshots when useful
- test responsive viewport sizes
- verify loading/error/success/empty states
- verify authentication-dependent routes
- verify important lifecycle states
- check for horizontal overflow and layout defects

For responsive verification test approximately:
- 1440px
- 1280px
- 768px
- 390px

Clearly distinguish:
- code/build verification
- browser verification
- authentication/session limitations

Never report "browser automation unavailable" merely because an unrelated browser tool or CLI is missing if BrowserAct is configured.

Do not substitute source-code inspection for browser verification when BrowserAct is available.