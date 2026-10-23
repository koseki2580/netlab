// Register layer plugins before any component renders (side-effect imports)
import '../src/layers/l1-physical/index';
import '../src/layers/l2-datalink/index';
import '../src/layers/l3-network/index';
import '../src/layers/l4-transport/index';
import '../src/layers/l7-application/index';

// Flow-v1 shared keyframes (page-fade-in / dp-slide-in / hint-pulse / orbit).
import '../src/components/animations.css';
// P5 — 44px hit-area expanders for CommandBar / NavRail icon buttons.
import '../src/components/shell-chrome.css';

import { StrictMode, useMemo, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProgressProvider } from '../src/progress';
import { ToastViewport } from '../src/components/ToastViewport';
import Gallery from './Gallery';
import CoursePage from './course/CoursePage';
import ExamPage from './course/ExamPage';
import ExerciseHub from './exercises/ExerciseHub';
import ExercisePage from './exercises/ExercisePage';
import LevelPage from './exercises/LevelPage';
import PlacementPage from './exercises/PlacementPage';
import ReportPage from './exercises/ReportPage';
import { PacketExercisePage, PacketHub, PacketLevelPage } from './exercises/packet/PacketPages';
import { resolveLearnerId } from './hooks/localLearnerId';
import { LESSONS, type Lesson } from './lessonManifest';
import CompareDemo from './compare/CompareDemo';

/**
 * Every lesson's page, imported before the app starts as the static imports
 * this replaced were, and found by the module the manifest names for it.
 */
const PAGES = import.meta.glob<{ default: ComponentType }>('./*/*Demo.tsx', { eager: true });

function pageOf(lesson: Lesson): ComponentType {
  const page = PAGES[`${lesson.module}.tsx`];
  if (!page) throw new Error(`No page for the lesson at ${lesson.path}`);
  return page.default;
}

const LESSON_ROUTES = (LESSONS as readonly Lesson[]).map((lesson) => ({
  path: lesson.path,
  Page: pageOf(lesson),
}));

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

function DemoRoutes() {
  const location = useLocation();
  const explicitLearnerId = new URLSearchParams(location.search).get('learnerId');
  // Without `?learnerId=` the app records under an id it keeps for this
  // browser, so a first-time learner's progress counts; with no storage,
  // progress stays off exactly as before.
  const learnerId = useMemo(() => resolveLearnerId(explicitLearnerId), [explicitLearnerId]);

  return (
    <ProgressProvider learnerId={learnerId}>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/course" element={<CoursePage />} />
        <Route path="/course/exam" element={<ExamPage />} />
        <Route path="/course/exam/:level" element={<ExamPage />} />
        <Route path="/exercises" element={<ExerciseHub />} />
        <Route path="/exercises/level/:level" element={<LevelPage />} />
        <Route path="/exercises/do/:exerciseId" element={<ExercisePage />} />
        <Route path="/exercises/placement" element={<PlacementPage />} />
        <Route path="/exercises/report" element={<ReportPage />} />
        <Route path="/exercises/packet" element={<PacketHub />} />
        <Route path="/exercises/packet/level/:level" element={<PacketLevelPage />} />
        <Route path="/exercises/packet/do/:exerciseId" element={<PacketExercisePage />} />
        <Route path="/compare/:left/:right" element={<CompareDemo />} />
        {LESSON_ROUTES.map(({ path, Page }) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastViewport />
    </ProgressProvider>
  );
}

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <DemoRoutes />
    </HashRouter>
  </StrictMode>,
);
