// stores/app-store.ts
// 全局应用状态管理 - Zustand

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  /** 侧边栏是否展开 */
  sidebarOpen: boolean;
  /** 当前选中的项目 ID（持久化，用于侧边栏导航） */
  currentProjectId: string | null;
  /** 当前项目类型 */
  currentProjectType: string | null;
  /** 移动端侧边栏是否打开 */
  mobileSidebarOpen: boolean;

  // 操作
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentProjectId: (id: string | null) => void;
  setCurrentProjectType: (type: string | null) => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      currentProjectId: null,
      currentProjectType: null,
      mobileSidebarOpen: false,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      setCurrentProjectType: (type) => set({ currentProjectType: type }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
    }),
    {
      name: "storyforge-app", // localStorage key
    }
  )
);
