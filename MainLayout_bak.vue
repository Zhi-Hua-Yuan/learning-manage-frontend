<template>
  <div class="flex h-screen w-screen bg-white overflow-hidden text-gray-800">
    <aside class="w-64 bg-gray-50 border-r border-gray-200 flex flex-col z-10">
      <div class="p-4 font-bold text-lg border-b border-gray-200 flex items-center gap-2">
        <span class="text-blue-500">✅</span> 我的滴答清单
      </div>

      <div class="px-2 py-3 border-b border-gray-100">
        <div
          @click="goToDashboard"
          class="flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors"
          :class="
            currentView === 'dashboard'
              ? 'bg-indigo-100 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">📊</span>
          <span class="flex-1 text-sm">数据仪表盘</span>
        </div>

        <div
          @click="goToReview"
          class="flex items-center gap-3 px-4 py-2 mt-1 rounded-lg cursor-pointer transition-colors"
          :class="
            currentView === 'review'
              ? 'bg-indigo-100 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">📅</span>
          <span class="flex-1 text-sm">周报回顾</span>
        </div>

        <div
          @click="goToAiPlanner"
          class="flex items-center gap-3 px-4 py-2 mt-1 rounded-lg cursor-pointer transition-colors"
          :class="
            currentView === 'ai-planner'
              ? 'bg-indigo-100 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">✨</span>
          <span
            class="flex-1 text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500"
          >
            AI 智能规划
          </span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-for="project in projectList"
          :key="project.id"
          @click="selectProject(project.id)"
          class="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg cursor-pointer transition-colors group"
          :class="
            selectedProjectId === project.id
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-200'
          "
        >
          <span class="text-xl">{{ project.icon || '📁' }}</span>
          <span class="flex-1 text-sm truncate">{{ project.name }}</span>

          <button
            @click.stop="deleteProject(project.id, project.name)"
            class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 transition-all rounded hover:bg-white"
            title="删除清单"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
          </button>
        </div>

        <div v-if="isAddingProject" class="px-4 py-2 mx-2 mt-1">
          <div
            class="flex items-center bg-white rounded border border-blue-400 overflow-hidden shadow-sm"
          >
            <input
              v-model="newProjectName"
              @keyup.enter="submitNewProject"
              @blur="isAddingProject = false"
              autofocus
              type="text"
              placeholder="清单名称 (按回车)"
              class="w-full text-sm px-3 py-1.5 outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-200">
        <button
          v-if="!isAddingProject"
          @click="openAddProjectInput"
          class="w-full flex items-center gap-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          添加清单
        </button>
      </div>

      <div class="mt-auto p-4 border-t border-gray-200 bg-gray-50 group relative">
        <div
          class="flex items-center justify-between cursor-pointer"
          @click="isUserMenuOpen = !isUserMenuOpen"
        >
          <div class="flex items-center gap-2 overflow-hidden">
            <div
              class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm"
            >
              {{
                currentUserInfo.username ? currentUserInfo.username.charAt(0).toUpperCase() : 'U'
              }}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold text-gray-700 truncate">{{
                currentUserInfo.username || '加载中...'
              }}</span>
              <span class="text-xs text-gray-400 truncate">{{
                currentUserInfo.account || '@user'
              }}</span>
            </div>
          </div>
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            ></path>
          </svg>
        </div>

        <div
          v-if="isUserMenuOpen"
          class="absolute bottom-16 left-4 w-[calc(100%-2rem)] bg-white border border-gray-100 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
        >
          <div
            @click="
              currentView = 'settings'
              isUserMenuOpen = false
            "
            class="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors text-gray-700"
          >
            <span>⚙️</span> 个人设置
          </div>
          <div class="h-px bg-gray-100 my-1"></div>
          <div
            @click="handleLogout"
            class="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-red-50 transition-colors text-red-600 font-medium"
          >
            <span>🚪</span> 退出登录
          </div>
        </div>
      </div>
    </aside>

    <main v-if="currentView === 'tasks'" class="flex-1 flex flex-col relative bg-white">
      <div class="p-4 border-b border-gray-200 font-bold text-xl flex items-center justify-between">
        <span>
          {{ projectList.find((p) => p.id === selectedProjectId)?.icon }}
          {{ projectList.find((p) => p.id === selectedProjectId)?.name }}
        </span>

        <div class="flex items-center gap-3 w-48" v-if="selectedProjectId && taskList.length > 0">
          <span class="text-xs text-gray-500 font-normal">完成度 {{ projectProgress }}%</span>
          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-green-500 transition-all duration-500"
              :style="{ width: projectProgress + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div class="px-4 py-3 border-b border-gray-100">
        <div
          class="flex items-center bg-gray-50 rounded px-3 py-2 border border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm"
        >
          <span class="text-gray-400 mr-2 font-bold text-lg">+</span>
          <input
            v-model="newTaskTitle"
            @keyup.enter="addTask"
            type="text"
            placeholder="添加任务至“默认列表”，按回车键保存"
            class="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div v-if="groupedTasks.unassigned.length > 0" class="flex flex-col">
          <div
            v-for="task in groupedTasks.unassigned"
            :key="task.id"
            @click="selectTask(task)"
            class="flex items-center group py-3 border-b border-gray-100 cursor-pointer rounded px-2 transition-colors"
            :class="selectedTask?.id === task.id ? 'bg-blue-50' : 'hover:bg-gray-50'"
          >
            <div
              class="w-5 h-5 rounded border mr-3 flex items-center justify-center cursor-pointer transition-colors"
              :class="task.status === 2 ? 'bg-blue-500 border-blue-500' : 'border-gray-400'"
              @click.stop="toggleTaskStatus(task)"
            >
              <svg
                v-if="task.status === 2"
                class="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <span
              class="flex-1 text-sm transition-all"
              :class="task.status === 2 ? 'text-gray-400 line-through' : 'text-gray-800'"
            >
              {{ task.title }}
            </span>
          </div>
        </div>

        <div
          v-for="group in groupedTasks.milestones"
          :key="group.milestone.id"
          class="bg-gray-50 rounded-xl p-4 border border-gray-100"
        >
          <div class="flex items-center justify-between mb-3 px-1 group relative">
            <div
              v-if="editingMilestoneId === group.milestone.id"
              class="flex-1 flex items-center gap-2 mr-4"
            >
              <span class="text-blue-500">🚩</span>
              <input
                v-model="editMilestoneName"
                @keyup.enter="saveMilestone(group.milestone)"
                @blur="saveMilestone(group.milestone)"
                v-focus
                type="text"
                class="flex-1 bg-white border border-blue-400 rounded px-2 py-0.5 text-sm font-bold text-gray-800 outline-none shadow-sm"
              />
            </div>

            <h3 v-else class="font-bold text-gray-800 flex items-center gap-2 flex-1">
              <span class="text-blue-500">🚩</span> {{ group.milestone.name }}

              <div
                class="opacity-0 group-hover:opacity-100 flex items-center ml-2 transition-opacity duration-200"
              >
                <button
                  @click="startEditMilestone(group.milestone)"
                  class="p-1 text-gray-400 hover:text-blue-500 hover:bg-white rounded"
                  title="重命名"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    ></path>
                  </svg>
                </button>
                <button
                  @click="deleteMilestone(group.milestone.id, group.milestone.name)"
                  class="p-1 text-gray-400 hover:text-red-500 hover:bg-white rounded"
                  title="删除阶段"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                </button>
              </div>
            </h3>

            <div class="flex items-center gap-2 w-28">
              <span class="text-xs text-gray-500">{{ group.progress }}%</span>
              <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-400 transition-all duration-500"
                  :style="{ width: group.progress + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
            <div
              v-if="group.tasks.length === 0"
              class="p-4 text-sm text-gray-400 text-center bg-gray-50/50"
            >
              该阶段暂无任务
            </div>

            <div
              v-for="task in group.tasks"
              :key="task.id"
              @click="selectTask(task)"
              class="flex items-center group py-3 border-b border-gray-50 cursor-pointer px-3 transition-colors hover:bg-blue-50"
              :class="selectedTask?.id === task.id ? 'bg-blue-50' : ''"
            >
              <div
                class="w-5 h-5 rounded border mr-3 flex items-center justify-center cursor-pointer transition-colors"
                :class="task.status === 2 ? 'bg-blue-500 border-blue-500' : 'border-gray-400'"
                @click.stop="toggleTaskStatus(task)"
              >
                <svg
                  v-if="task.status === 2"
                  class="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <span
                class="flex-1 text-sm transition-all"
                :class="task.status === 2 ? 'text-gray-400 line-through' : 'text-gray-800'"
              >
                {{ task.title }}
              </span>
            </div>
          </div>
        </div>
        <div class="mt-2 mb-8">
          <div
            v-if="isAddingMilestone"
            class="bg-white rounded-lg border border-blue-400 overflow-hidden shadow-sm p-1"
          >
            <input
              v-model="newMilestoneName"
              @keyup.enter="submitNewMilestone"
              @blur="isAddingMilestone = false"
              autofocus
              type="text"
              placeholder="里程碑名称 (例如: V1.0 核心功能) - 按回车保存"
              class="w-full text-sm px-3 py-2 outline-none text-gray-700 bg-transparent"
            />
          </div>

          <button
            v-else
            @click="openAddMilestoneInput"
            class="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all font-medium text-sm"
          >
            <span class="text-lg font-bold">+</span> 添加阶段 (Milestone)
          </button>
        </div>
      </div>
    </main>

    <main
      v-else-if="currentView === 'dashboard'"
      class="flex-1 flex flex-col relative bg-gray-50 overflow-y-auto p-8"
    >
      <div class="max-w-5xl mx-auto w-full space-y-8">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">📊 数据仪表盘</h2>
          <span class="text-sm text-gray-500">数据实时更新</span>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <div
            class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center transition-transform hover:-translate-y-1"
          >
            <span class="text-gray-500 text-sm font-medium mb-2">进行中项目</span>
            <span class="text-4xl font-black text-blue-500">{{
              statsData.activeProjects || 0
            }}</span>
          </div>
          <div
            class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center transition-transform hover:-translate-y-1"
          >
            <span class="text-gray-500 text-sm font-medium mb-2">今日到期任务</span>
            <span class="text-4xl font-black text-orange-500">{{ statsData.todayTasks || 0 }}</span>
          </div>
          <div
            class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center transition-transform hover:-translate-y-1"
          >
            <span class="text-gray-500 text-sm font-medium mb-2">已逾期任务</span>
            <span class="text-4xl font-black text-red-500">{{ statsData.overdueTasks || 0 }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <div class="col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 class="text-lg font-bold text-gray-700 mb-4">近 7 天完成趋势</h3>
            <div ref="trendChartRef" class="w-full h-64"></div>
          </div>

          <div
            class="col-span-1 bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col"
          >
            <h3 class="text-lg font-bold text-gray-700 mb-4">🏆 完成率 Top 排行</h3>
            <div class="flex-1 overflow-y-auto space-y-4 pr-2">
              <div
                v-if="!statsData.topProjects || statsData.topProjects.length === 0"
                class="text-center text-gray-400 mt-10 text-sm"
              >
                暂无数据
              </div>
              <div
                v-for="(proj, index) in statsData.topProjects"
                :key="index"
                class="flex items-center gap-3"
              >
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  :class="
                    index === 0
                      ? 'bg-yellow-100 text-yellow-600'
                      : index === 1
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-orange-50 text-orange-400'
                  "
                >
                  {{ index + 1 }}
                </div>
                <div class="flex-1 truncate text-sm font-medium text-gray-700">{{ proj.name }}</div>
                <div class="text-sm font-bold text-green-500">{{ proj.rate }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <main
      v-else-if="currentView === 'review'"
      class="flex-1 flex flex-col relative bg-gray-50 overflow-y-auto p-8"
    >
      <div class="max-w-6xl mx-auto w-full space-y-6">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📅 周报回顾与规划
          </h2>
          <span class="text-sm text-gray-500">温故而知新</span>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <div class="col-span-2 space-y-6">
            <div
              class="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-md flex justify-between items-center"
            >
              <div>
                <div class="text-blue-100 text-sm font-medium mb-1">
                  第 {{ currentReview.weekNo || '?' }} 周 ({{ currentReview.startDate }} ~
                  {{ currentReview.endDate }})
                </div>
                <div class="text-2xl font-bold">本周高光时刻</div>
              </div>
              <div class="flex gap-6 text-center">
                <div class="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <div class="text-3xl font-black">{{ currentReview.completedTaskCount || 0 }}</div>
                  <div class="text-xs text-blue-100 mt-1">完成任务数</div>
                </div>
                <div class="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm min-w-[100px]">
                  <div class="text-xl font-bold truncate mt-1">
                    {{ currentReview.focusProjectName || '暂无重点' }}
                  </div>
                  <div class="text-xs text-blue-100 mt-1">核心推进项目</div>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span>🧠</span> 本周复盘 (Reflection)
                  </label>

                  <button
                    @click="handleAiPolish"
                    :disabled="isPolishing"
                    class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                    :class="
                      isPolishing
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-md hover:scale-105'
                    "
                  >
                    <svg
                      v-if="isPolishing"
                      class="animate-spin h-3 w-3 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span v-else>✨</span>
                    {{ isPolishing ? 'AI 思考中...' : 'AI 一键润色' }}
                  </button>
                </div>
                <textarea
                  v-model="currentReview.reflection"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all min-h-[120px] resize-none"
                  placeholder="这周做的好与不好的地方？有什么感悟？..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span>🎯</span> 下周计划 (Next Plan)
                </label>
                <textarea
                  v-model="currentReview.nextPlan"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all min-h-[120px] resize-none"
                  placeholder="下周的核心目标是什么？打算怎么安排时间？..."
                ></textarea>
              </div>

              <div class="flex justify-end pt-2">
                <button
                  @click="saveReview"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    ></path>
                  </svg>
                  保存本周总结
                </button>
              </div>
            </div>
          </div>

          <div
            class="col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-12rem)]"
          >
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🕰️</span> 历史轨迹
            </h3>
            <div class="flex-1 overflow-y-auto space-y-4 pr-2">
              <div
                v-if="historyReviews.length === 0"
                class="text-center text-gray-400 mt-10 text-sm"
              >
                暂无历史记录
              </div>

              <div
                v-for="item in historyReviews"
                :key="item.id"
                class="border-l-2 border-blue-200 pl-4 py-2 relative group"
              >
                <div
                  class="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-3 border-2 border-white"
                ></div>
                <div class="text-xs text-gray-400 font-medium mb-1">
                  {{ item.year }} 年 • 第 {{ item.weekNo }} 周
                </div>
                <div class="bg-gray-50 rounded-lg p-3 group-hover:bg-blue-50 transition-colors">
                  <div class="text-sm font-bold text-gray-700 mb-1 line-clamp-1">
                    {{ item.focusProjectName || '日常推进' }}
                  </div>
                  <div class="text-xs text-gray-500 line-clamp-2">
                    {{ item.reflection || '无复盘内容' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <main
      v-else-if="currentView === 'ai-planner'"
      class="flex-1 flex flex-col relative bg-gray-50 overflow-y-auto p-8"
    >
      <div class="max-w-4xl mx-auto w-full space-y-8">
        <div class="text-center space-y-2 mb-8">
          <h2 class="text-3xl font-black text-gray-800 tracking-tight">
            让
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500"
              >AI</span
            >
            帮你拆解宏大目标
          </h2>
          <p class="text-gray-500">只需一句话，自动生成包含阶段与任务的落地执行计划</p>
        </div>

        <div
          class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-6 relative overflow-hidden"
        >
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"
          ></div>

          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2">
              <label class="block text-sm font-bold text-gray-700 mb-2">🎯 你的目标是什么？</label>
              <input
                v-model="aiForm.target"
                type="text"
                placeholder="例如：三个月内通过英语六级 / 独立开发一款小程序"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-purple-400 transition-all"
              />
            </div>
            <div class="col-span-1">
              <label class="block text-sm font-bold text-gray-700 mb-2">⏳ 期望周期</label>
              <input
                v-model="aiForm.duration"
                type="text"
                placeholder="例如：12周 / 1个月"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-purple-400 transition-all"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-bold text-gray-700 mb-2">📝 补充描述 (可选)</label>
              <textarea
                v-model="aiForm.description"
                placeholder="例如：我目前的基础比较薄弱，希望前两周以背单词和基础语法为主..."
                class="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:bg-white focus:border-purple-400 transition-all min-h-[80px] resize-none"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-center pt-4">
            <button
              @click="generatePlan"
              :disabled="isGeneratingPlan"
              class="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              :class="isGeneratingPlan ? 'opacity-70 cursor-not-allowed' : ''"
            >
              <svg
                v-if="isGeneratingPlan"
                class="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span v-else>✨</span>
              {{ isGeneratingPlan ? 'AI 正在疯狂燃烧 GPU...' : '开始智能拆解' }}
            </button>
          </div>
        </div>

        <div
          v-if="generatedPlan.length > 0"
          class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 animate-fade-in-up"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-gray-800">📋 生成的专属计划草稿</h3>
            <button
              @click="applyPlanToSystem"
              :disabled="isApplying"
              class="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-sm flex items-center gap-2 text-sm"
              :class="isApplying ? 'opacity-70 cursor-not-allowed' : ''"
            >
              <span v-if="isApplying">导入中...</span>
              <span v-else>✅ 一键生成项目并导入系统</span>
            </button>
          </div>

          <div class="space-y-6">
            <div
              v-for="(milestone, mIndex) in generatedPlan"
              :key="mIndex"
              class="border border-purple-100 rounded-xl p-5 bg-purple-50/30"
            >
              <h4 class="font-bold text-purple-700 mb-3 flex items-center gap-2">
                <span
                  class="bg-purple-200 text-purple-800 w-6 h-6 rounded flex items-center justify-center text-xs"
                  >阶段 {{ mIndex + 1 }}</span
                >
                {{ milestone.name }}
              </h4>
              <div class="space-y-2 pl-8">
                <div
                  v-for="(task, tIndex) in milestone.tasks"
                  :key="tIndex"
                  class="flex items-start gap-2 text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
                >
                  <span class="text-gray-400 mt-0.5">▪</span>
                  <div>
                    <div class="font-medium">{{ task.title || task.name }}</div>
                    <div v-if="task.description" class="text-xs text-gray-500 mt-1">
                      {{ task.description }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <main
      v-else-if="currentView === 'settings'"
      class="flex-1 flex flex-col relative bg-gray-50 overflow-y-auto p-8"
    >
      <div class="max-w-3xl mx-auto w-full space-y-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">⚙️ 个人设置</h2>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="flex border-b border-gray-100">
            <button
              @click="settingsTab = 'basic'"
              :class="
                settingsTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              "
              class="flex-1 py-4 text-sm font-bold border-b-2 transition-colors"
            >
              基本信息
            </button>
            <button
              @click="settingsTab = 'security'"
              :class="
                settingsTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              "
              class="flex-1 py-4 text-sm font-bold border-b-2 transition-colors"
            >
              安全设置
            </button>
          </div>

          <div v-if="settingsTab === 'basic'" class="p-8 space-y-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">登录账号 (不可修改)</label>
              <input
                :value="currentUserInfo.account"
                disabled
                type="text"
                class="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">显示昵称</label>
              <input
                v-model="updateInfoForm.username"
                type="text"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
              />
            </div>
            <div class="pt-4">
              <button
                @click="handleUpdateInfo"
                class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm"
              >
                保存修改
              </button>
            </div>
          </div>

          <div v-if="settingsTab === 'security'" class="p-8 space-y-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">当前密码</label>
              <input
                v-model="updatePwdForm.oldPassword"
                type="password"
                placeholder="请输入旧密码"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">新密码</label>
              <input
                v-model="updatePwdForm.newPassword"
                type="password"
                placeholder="至少 8 位"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">确认新密码</label>
              <input
                v-model="updatePwdForm.confirmNewPassword"
                type="password"
                placeholder="再次输入新密码"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-400 transition-all"
              />
            </div>
            <div class="pt-4">
              <button
                @click="handleUpdatePassword"
                class="bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm"
              >
                更新密码
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <aside
      v-if="currentView === 'tasks' && selectedTask"
      class="w-80 bg-white border-l border-gray-200 flex flex-col shadow-sm z-10"
    >
      <div class="p-4 border-b border-gray-100 flex justify-between items-center text-gray-500">
        <span class="text-sm font-medium">任务详情</span>

        <div class="flex items-center gap-1">
          <button
            @click="deleteTask"
            class="hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
            title="删除任务"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
          </button>

          <button
            @click="closeDetail"
            class="hover:text-gray-800 p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="关闭详情"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        <input
          v-model="selectedTask.title"
          @blur="onTextBlur"
          type="text"
          class="text-xl font-bold text-gray-800 outline-none w-full bg-transparent placeholder-gray-300"
          placeholder="准备做什么？"
        />

        <div class="flex items-center gap-3 border-y border-gray-100 py-3 relative">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-1 6-1 1H11.5l-1-1H5v12"
            ></path>
          </svg>
          <label class="text-sm font-medium text-gray-600">优先级:</label>

          <div
            @click="isPriorityMenuOpen = !isPriorityMenuOpen"
            class="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
            :class="currentPriorityObj.color"
          >
            <span>{{ currentPriorityObj.icon }}</span>
            <span class="text-sm font-medium">{{ currentPriorityObj.text }}</span>
          </div>

          <div
            v-if="isPriorityMenuOpen"
            class="absolute top-12 left-24 w-40 bg-white border border-gray-100 rounded-lg shadow-xl z-20 py-1 overflow-hidden"
          >
            <div
              v-for="option in priorityOptions"
              :key="option.value"
              @click="selectPriority(option.value)"
              class="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              :class="option.color"
            >
              <span>{{ option.icon }}</span>
              <span class="font-medium">{{ option.text }}</span>

              <svg
                v-if="selectedTask.priority === option.value"
                class="w-4 h-4 ml-auto text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 border-b border-gray-100 py-3 relative">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
          <label class="text-sm font-medium text-gray-600 w-16">截止日期:</label>

          <div class="relative flex-1 flex items-center">
            <input
              type="date"
              :value="selectedTask.dueDate || ''"
              @change="onDueDateChange"
              class="w-full text-sm outline-none bg-transparent cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
              :class="!selectedTask.dueDate ? 'text-transparent' : 'text-gray-700'"
            />
            <span
              v-if="!selectedTask.dueDate"
              class="absolute left-0 text-sm text-gray-400 pointer-events-none"
            >
              设置截止日期...
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3 border-b border-gray-100 py-3 relative">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            ></path>
          </svg>
          <label class="text-sm font-medium text-gray-600 w-16">所属阶段:</label>

          <select
            :value="selectedTask.milestoneId || ''"
            @change="onMilestoneChange"
            class="flex-1 text-sm outline-none bg-transparent text-gray-700 cursor-pointer"
          >
            <option value="">(默认列表 / 未分配)</option>
            <option v-for="m in milestoneList" :key="m.id" :value="m.id">🚩 {{ m.name }}</option>
          </select>
        </div>

        <textarea
          v-model="selectedTask.description"
          @blur="onTextBlur"
          class="w-full text-sm text-gray-600 outline-none resize-none bg-gray-50 rounded p-3 min-h-[120px] focus:bg-blue-50 focus:ring-1 focus:ring-blue-200 transition-all"
          placeholder="添加描述..."
        ></textarea>
      </div>
    </aside>

    <aside
      v-else-if="currentView === 'tasks'"
      class="w-80 bg-gray-50 border-l border-gray-200 flex flex-col items-center justify-center text-gray-400"
    >
      <svg
        class="w-16 h-16 mb-4 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        ></path>
      </svg>
      <p class="text-sm">点击任务查看详情</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { fetchProjectList, addProjectApi, deleteProjectApi } from '@/api/project'
import { fetchStatsOverview } from '@/api/stats'
import { fetchCurrentReview, saveReviewApi, fetchReviewHistory } from '@/api/review'
import { aiPolishApi, aiBreakdownApi } from '@/api/ai'
import { fetchTaskList, addTaskApi, updateTaskApi, deleteTaskApi } from '@/api/task'
import { getUserMeApi, logoutApi, updateUserInfoApi, updatePasswordApi } from '@/api/user'
import {
  fetchMilestoneList,
  addMilestoneApi,
  updateMilestoneApi,
  deleteMilestoneApi,
} from '@/api/milestone'

interface Task {
  id: string
  title: string
  description?: string
  status: number
  priority: number
  projectId: string
  dueDate?: string
  milestoneId?: string | null
}

interface Milestone {
  id: string
  name: string
  projectId: string
  orderNo: number
  status: number
}

interface Project {
  id: string
  name: string
  icon: string
}

interface CurrentUserInfo {
  username?: string
  account?: string
}

const projectList = ref<Project[]>([])
const taskList = ref<Task[]>([])
const selectedProjectId = ref(localStorage.getItem('tick_selectedProjectId') || '')
const selectedTask = ref<Task | null>(null)
const milestoneList = ref<Milestone[]>([])
const currentUserInfo = ref<CurrentUserInfo>({})
const isUserMenuOpen = ref(false)
// 【新增：新建里程碑逻辑】
const isAddingMilestone = ref(false)
const newMilestoneName = ref('')
// 控制当前正在编辑的里程碑 ID 和绑定的名字
const editingMilestoneId = ref('')
const editMilestoneName = ref('')
// 'tasks' 表示正常任务列表，'dashboard' 表示数据大屏
const currentView = ref(localStorage.getItem('tick_currentView') || 'tasks')

watch(currentView, (newVal) => {
  localStorage.setItem('tick_currentView', newVal)
})

watch(selectedProjectId, (newVal) => {
  localStorage.setItem('tick_selectedProjectId', newVal)
})

// ================== 核心联调逻辑开始 ==================

// 1. 加载左侧项目清单
const loadUserInfo = async () => {
  try {
    const res: unknown = await getUserMeApi()
    currentUserInfo.value = res && typeof res === 'object' ? (res as CurrentUserInfo) : {}
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

// 1. 加载左侧项目清单
const loadProjects = async () => {
  try {
    // 调用后端 /project/list 接口
    const res: any = await fetchProjectList()
    // ⚠️ 重点：因为你后端返回的是 Page<ProjectVo>，所以真实的列表数据在 res.records 里
    projectList.value = res.records || []

    // 如果有清单，默认选中第一个，并加载它的任务
    if (projectList.value.length > 0) {
      selectedProjectId.value = projectList.value[0].id
      await loadTasks()
    }
  } catch (error) {
    console.error('加载项目失败', error)
  }
}

// 【新增：左侧清单新建逻辑】
const isAddingProject = ref(false) // 控制输入框是否显示的开关
const newProjectName = ref('') // 绑定的新清单名字

const settingsTab = ref<'basic' | 'security'>('basic')
const updateInfoForm = ref({ username: '' })
const updatePwdForm = ref({ oldPassword: '', newPassword: '', confirmNewPassword: '' })

watch(currentView, (val) => {
  if (val === 'settings') {
    updateInfoForm.value.username = currentUserInfo.value.username || ''
  }
})

const handleUpdateInfo = async () => {
  if (!updateInfoForm.value.username) {
    alert('昵称不能为空')
    return
  }

  try {
    await updateUserInfoApi({ username: updateInfoForm.value.username })
    alert('✅ 信息修改成功！')
    await loadUserInfo()
  } catch {
    alert('修改失败')
  }
}

const handleUpdatePassword = async () => {
  const { oldPassword, newPassword, confirmNewPassword } = updatePwdForm.value
  if (!oldPassword || !newPassword || !confirmNewPassword) {
    alert('请完整填写密码信息')
    return
  }
  if (newPassword !== confirmNewPassword) {
    alert('两次输入的新密码不一致')
    return
  }
  if (newPassword.length < 8) {
    alert('新密码长度不能少于 8 位')
    return
  }

  try {
    await updatePasswordApi({ oldPassword, newPassword })
    alert('✅ 密码修改成功！请重新登录。')
    localStorage.removeItem('token')
    router.push('/login')
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { data?: { message?: string } } }).response?.data?.message
    ) {
      alert((error as { response?: { data?: { message?: string } } }).response?.data?.message)
      return
    }
    alert('修改密码失败')
  }
}

const submitNewProject = async () => {
  const name = newProjectName.value.trim()

  // 如果没输入内容就回车，直接取消并收起输入框
  if (!name) {
    isAddingProject.value = false
    return
  }

  try {
    // 1. 调用后端接口创建清单（可以默认给个可爱的文件夹图标）
    await addProjectApi({ name: name, icon: '📁' })

    // 2. 清空输入框并隐藏
    newProjectName.value = ''
    isAddingProject.value = false

    // 3. 重新加载左侧列表，新清单就会出现！
    await loadProjects()
  } catch (error) {
    alert('创建清单失败，请检查控制台')
  }
}

// 2. 加载中间任务列表
const loadTasks = async () => {
  if (!selectedProjectId.value) return
  try {
    // 调用后端 /task/list 接口，传入 projectId 参数
    const res: any = await fetchTaskList({
      projectId: selectedProjectId.value,
      current: 1,
      size: 100, // 初期不考虑翻页，先拉取前100条
    })
    // 同理，取 records 里的数据
    taskList.value = res.records || []
  } catch (error) {
    console.error('加载任务失败', error)
  }
}

// 3. 页面初始化时执行
onMounted(() => {
  loadUserInfo()
  loadProjects()
})

// ================== 用户交互逻辑更新 ==================

// 【新增：加载当前项目的里程碑】
const loadMilestones = async () => {
  if (!selectedProjectId.value) return
  try {
    const res: any = await fetchMilestoneList({ projectId: selectedProjectId.value })
    // 如果后端直接返回 List，就是 res；如果是 Page，就是 res.records。请根据实际情况调整。
    // 假设后端返回的是列表：
    milestoneList.value = res || []

    // 如果有 orderNo，前端排个序保证展示顺序
    milestoneList.value.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
  } catch (error) {
    console.error('加载里程碑失败', error)
  }
}

// 切换左侧清单
const selectProject = async (id: string) => {
  currentView.value = 'tasks' // 👈 就是新增这一行
  selectedProjectId.value = id
  selectedTask.value = null

  await Promise.all([loadMilestones(), loadTasks()])
}

// 切换到数据仪表盘视图
const goToDashboard = () => {
  currentView.value = 'dashboard'
  selectedProjectId.value = ''
  selectedTask.value = null
}

const goToReview = () => {
  currentView.value = 'review'
  selectedProjectId.value = ''
  selectedTask.value = null
}

const goToAiPlanner = () => {
  currentView.value = 'ai-planner'
  selectedProjectId.value = ''
  selectedTask.value = null
}

// 前端过滤视图 (其实既然我们每次切换都调接口了，这里也可以不用计算属性过滤了，但保留也无妨)
const filteredTasks = computed(() => {
  return taskList.value // 现在 taskList 里本身就是当前选中的清单数据了
})

// 新增任务
const newTaskTitle = ref('')
const addTask = async () => {
  if (!newTaskTitle.value.trim()) return

  try {
    // 构造发给后端的 Request Body (对应你的 TaskCreateRequest)
    const reqData = {
      title: newTaskTitle.value.trim(),
      projectId: selectedProjectId.value, // 如果报错说 projectId 为空，确保你左侧选中了某个清单
      priority: 0, // 👈 明确告诉后端：这个新任务是 0（无优先级）
    }

    // 调用新增接口
    await addTaskApi(reqData)

    // 新增成功后，清空输入框，并重新拉取列表刷新页面
    newTaskTitle.value = ''
    await loadTasks()
  } catch (error) {
    alert('添加任务失败！请看控制台报错')
  }
}

// 切换任务状态（勾选完成）
const toggleTaskStatus = async (task: Task) => {
  const newStatus = task.status === 2 ? 0 : 2

  try {
    // 先乐观更新 UI
    task.status = newStatus

    // 👇 重点修改：使用 ...task 把任务的所有字段都传过去，并用 newStatus 覆盖状态
    await updateTaskApi({
      ...task,
      status: newStatus,
    })
  } catch (error) {
    // 如果后端报错，UI 回滚
    task.status = task.status === 2 ? 0 : 2
    alert('更新状态失败')
  }
}

// 点击选择任务、关闭详情页、优先级等逻辑保留不变即可...
const selectTask = (task: Task) => {
  selectedTask.value = task
}
const closeDetail = () => {
  selectedTask.value = null
}
const isPriorityMenuOpen = ref(false)
const priorityOptions = [
  { value: 0, text: '无优先级', color: 'text-gray-400', icon: '🏳️' },
  { value: 1, text: '低优先级', color: 'text-blue-500', icon: '🔵' },
  { value: 2, text: '中优先级', color: 'text-orange-500', icon: '🟠' },
  { value: 3, text: '高优先级', color: 'text-red-600', icon: '🚩' },
]
const currentPriorityObj = computed(() => {
  if (!selectedTask.value) return priorityOptions[0]
  return priorityOptions.find((p) => p.value === selectedTask.value!.priority) || priorityOptions[0]
})
const selectPriority = async (val: number) => {
  if (selectedTask.value) {
    const oldPriority = selectedTask.value.priority
    selectedTask.value.priority = val // 更新UI
    isPriorityMenuOpen.value = false

    try {
      // 👇 重点修改：使用 ...selectedTask.value 把所有字段传过去，覆盖 priority
      await updateTaskApi({
        ...selectedTask.value,
        priority: val,
      })
    } catch (e) {
      selectedTask.value.priority = oldPriority // 失败回滚
    }
  }
}

// 【新增：处理截止日期变更】
const onDueDateChange = async (event: Event) => {
  if (!selectedTask.value) return

  const target = event.target as HTMLInputElement
  const newDate = target.value

  // 处理空字符串变成严格的 null，防止后端或前端出现 NaN
  const finalDate = newDate === '' ? null : newDate

  // 乐观更新 UI
  const oldDate = selectedTask.value.dueDate
  // 绕过 TS 检查，直接赋 null
  ;(selectedTask.value as any).dueDate = finalDate

  try {
    // 👇 重点修改：使用 ...selectedTask.value 把所有字段传过去，覆盖 dueDate
    await updateTaskApi({
      ...selectedTask.value,
      dueDate: finalDate,
    })

    // 重新拉取一下列表，确保两边数据一致
    await loadTasks()
  } catch (error) {
    // 失败回滚
    selectedTask.value.dueDate = oldDate
    alert('更新日期失败')
  }
}

// 【新增：处理所属里程碑变更】
const onMilestoneChange = async (event: Event) => {
  if (!selectedTask.value) return

  const target = event.target as HTMLSelectElement
  const newMilestoneId = target.value

  // 乐观更新 UI：如果是空字符串，说明用户选了“未分配”，处理成 null
  const finalMilestoneId = newMilestoneId === '' ? null : newMilestoneId
  const oldMilestoneId = selectedTask.value.milestoneId

  // 绕过 TS 严格检查
  ;(selectedTask.value as any).milestoneId = finalMilestoneId

  try {
    // 同步给后端：我们依然使用那个全量更新的接口
    await updateTaskApi({
      ...selectedTask.value,
      milestoneId: finalMilestoneId,
    })

    // ⚠️ 最核心的一步：重新拉取任务列表
    // 拉取完之后，groupedTasks 会自动重新计算，你会看到任务瞬间跳到对应的里程碑下面！
    await loadTasks()
  } catch (error) {
    // 失败回滚
    selectedTask.value.milestoneId = oldMilestoneId
    alert('更新所属阶段失败')
  }
}

// 【新增：无感自动保存标题和描述】
const onTextBlur = async () => {
  if (!selectedTask.value) return

  try {
    // 只要输入框失去焦点，就把当前最新的任务数据（包括标题和描述）全量发给后端更新
    await updateTaskApi({
      ...selectedTask.value,
    })
    // 重新加载列表，确保左侧、中间的标题也跟着实时更新
    await loadTasks()
  } catch (error) {
    console.error('保存文本失败', error)
  }
}

// 【新增：删除当前选中的任务】
const deleteTask = async () => {
  if (!selectedTask.value) return

  // 1. 浏览器原生的确认弹窗（极简防误触）
  const isConfirm = window.confirm(`确定要删除任务 "${selectedTask.value.title}" 吗？`)
  if (!isConfirm) return

  try {
    // 2. 调用后端删除接口
    await deleteTaskApi(selectedTask.value.id)

    // 3. UI 联动：关闭右侧详情页
    selectedTask.value = null

    // 4. 重新加载最新列表
    await loadTasks()
  } catch (error) {
    alert('删除失败，请看控制台报错')
  }
}

const openAddProjectInput = () => {
  isAddingProject.value = true
  newProjectName.value = ''
}

// 【新增：删除清单逻辑】
const deleteProject = async (id: string, name: string) => {
  // 1. 危险操作，必须二次确认
  const isConfirm = window.confirm(`确定要删除清单 "${name}" 吗？相关的任务可能会一并丢失！`)
  if (!isConfirm) return

  try {
    // 2. 调用后端删除接口
    await deleteProjectApi(id)

    // 3. UI 联动：如果你当前正在看这个被删除的清单，我们需要清空中间的屏幕
    if (selectedProjectId.value === id) {
      selectedProjectId.value = ''
      taskList.value = []
      selectedTask.value = null // 右侧详情也关掉
    }

    // 4. 重新加载左侧列表
    await loadProjects()
  } catch (error) {
    alert('删除清单失败，请检查控制台报错')
  }
}

const router = useRouter()

// 退出登录逻辑
const handleLogout = async () => {
  if (!window.confirm('确定要退出登录吗？')) return
  try {
    await logoutApi()
  } catch {}
  localStorage.removeItem('token')
  router.push('/login')
}

// 【新增：计算当前项目的总体进度 0 ~ 100】
const projectProgress = computed(() => {
  if (taskList.value.length === 0) return 0 // 没有任务时进度为 0

  // 统计 status === 2 (已完成) 的任务数量
  const completedCount = taskList.value.filter((t) => t.status === 2).length

  // 计算百分比并保留整数
  return Math.round((completedCount / taskList.value.length) * 100)
})

// 【新增：里程碑分组与独立进度计算】
const groupedTasks = computed(() => {
  // 1. 初始化数据结构：一个“未分配区” + 多个“里程碑区”
  const result = {
    unassigned: [] as Task[],
    milestones: [] as { milestone: Milestone; tasks: Task[]; progress: number }[],
  }

  // 2. 把当前所有的里程碑“空壳”放进去
  milestoneList.value.forEach((m) => {
    result.milestones.push({ milestone: m, tasks: [], progress: 0 })
  })

  // 3. 遍历所有任务，根据 milestoneId 将它们塞进对应的壳子里
  taskList.value.forEach((task) => {
    // 假设没有传、传了空或者 '0' 都代表未分配里程碑
    if (task.milestoneId && String(task.milestoneId) !== '0') {
      const group = result.milestones.find((g) => g.milestone.id === String(task.milestoneId))
      if (group) {
        group.tasks.push(task)
      } else {
        result.unassigned.push(task)
      }
    } else {
      result.unassigned.push(task)
    }
  })

  // 4. 计算每个里程碑自己内部的进度百分比
  result.milestones.forEach((g) => {
    if (g.tasks.length === 0) {
      g.progress = 0
    } else {
      const completedCount = g.tasks.filter((t) => t.status === 2).length
      g.progress = Math.round((completedCount / g.tasks.length) * 100)
    }
  })

  return result
})

const submitNewMilestone = async () => {
  const name = newMilestoneName.value.trim()
  if (!name || !selectedProjectId.value) {
    isAddingMilestone.value = false
    return
  }

  try {
    // 调用新增接口，将新里程碑排在最后面
    await addMilestoneApi({
      name: name,
      projectId: selectedProjectId.value,
      orderNo: milestoneList.value.length, // 简单的排序序号
    })

    // 清空并收起输入框
    newMilestoneName.value = ''
    isAddingMilestone.value = false

    // 重新拉取当前项目的里程碑列表
    await loadMilestones()
  } catch (error) {
    alert('创建里程碑失败，请检查控制台报错')
  }
}

const openAddMilestoneInput = () => {
  isAddingMilestone.value = true
  newMilestoneName.value = ''
}

// 点击编辑按钮，进入编辑模式
const startEditMilestone = (milestone: Milestone) => {
  editingMilestoneId.value = milestone.id
  editMilestoneName.value = milestone.name
}

// 保存修改后的里程碑名称
const saveMilestone = async (milestone: Milestone) => {
  const newName = editMilestoneName.value.trim()

  // 如果没修改或者改成了空，直接取消编辑状态
  if (!newName || newName === milestone.name) {
    editingMilestoneId.value = ''
    return
  }

  try {
    await updateMilestoneApi({ ...milestone, name: newName })
    editingMilestoneId.value = ''
    await loadMilestones() // 重新加载数据
  } catch (error) {
    alert('重命名失败')
  }
}

// 删除里程碑
const deleteMilestone = async (id: string, name: string) => {
  const isConfirm = window.confirm(
    `确定要删除阶段 "${name}" 吗？\n该阶段下的任务不会被删除，但会变回"未分配"状态！`,
  )
  if (!isConfirm) return

  try {
    await deleteMilestoneApi(id)
    // 删除阶段后，为了防止数据不一致，同时重新拉取里程碑和任务
    await Promise.all([loadMilestones(), loadTasks()])
  } catch (error) {
    alert('删除阶段失败')
  }
}

// ================== 数据仪表盘逻辑 ==================
const statsData = ref({
  activeProjects: 0,
  todayTasks: 0,
  overdueTasks: 0,
  trendDates: [] as string[],
  trendCounts: [] as number[],
  topProjects: [] as { name: string; rate: number }[],
})

const trendChartRef = ref<HTMLElement | null>(null)
let trendChart: echarts.ECharts | null = null

const initTrendChart = () => {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }
  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 30 },
    xAxis: {
      type: 'category',
      data: statsData.value.trendDates || [],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#9CA3AF', margin: 12 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#F3F4F6' } },
      axisLabel: { color: '#9CA3AF' },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 8,
      borderWidth: 0,
      padding: [10, 15],
      textStyle: { color: '#374151', fontWeight: 'bold' },
      extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);',
    },
    series: [
      {
        data: statsData.value.trendCounts || [],
        type: 'bar',
        barWidth: '25%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#60A5FA' },
            { offset: 1, color: '#3B82F6' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  }
  trendChart.setOption(option)
}

// 监听菜单切换：只要切换到了仪表盘，立刻请求数据并画图！
watch(currentView, async (newVal) => {
  if (newVal === 'dashboard') {
    try {
      // 1. 拉取后端真实数据
      // 注意：这里假设你的 axios 拦截器已经把外层的 {code:0, data: {...}} 剥离了，res 直接是里面的 data 对象
      const res: any = await fetchStatsOverview()

      if (res) {
        // 2. 核心数据手动映射
        statsData.value.activeProjects = res.coreMetrics?.ongoingProjectCount || 0
        statsData.value.todayTasks = res.coreMetrics?.dueTodayTaskCount || 0
        statsData.value.overdueTasks = res.coreMetrics?.overdueTaskCount || 0

        // 3. 趋势图数据转换：把对象数组 map 成两个一维数组
        statsData.value.trendDates = (res.dailyTrends || []).map((item: any) => item.date)
        statsData.value.trendCounts = (res.dailyTrends || []).map(
          (item: any) => item.completedCount,
        )

        // 4. 排行榜数据转换：字段重命名
        statsData.value.topProjects = (res.projectRankings || []).map((item: any) => ({
          name: item.projectName,
          rate: item.progress,
        }))
      }

      // 5. 等待 Vue 渲染 HTML 后，初始化 ECharts 图表
      await nextTick()
      initTrendChart()
    } catch (error) {
      console.error('拉取大屏数据失败', error)
    }
  }
})

// ================== 周报回顾逻辑 ==================
const currentReview = ref<any>({})
const historyReviews = ref<any[]>([])
// AI 润色状态
const isPolishing = ref(false)

const loadReviewData = async () => {
  try {
    // 恢复原样：拦截器已经解包了，直接赋值！
    const currentRes: any = await fetchCurrentReview()
    currentReview.value = currentRes || {}

    const historyRes: any = await fetchReviewHistory()
    historyReviews.value = historyRes || []
  } catch (error) {
    console.error('加载周报数据失败', error)
  }
}

const saveReview = async () => {
  try {
    await saveReviewApi({
      year: currentReview.value.year,
      weekNo: currentReview.value.weekNo,
      startDate: currentReview.value.startDate,
      endDate: currentReview.value.endDate,
      completedTaskCount: currentReview.value.completedTaskCount,
      focusProjectName: currentReview.value.focusProjectName,
      reflection: currentReview.value.reflection,
      nextPlan: currentReview.value.nextPlan,
    })
    alert('🎉 本周总结保存成功！')
    await loadReviewData() // 刷新一下历史记录
  } catch (error) {
    alert('保存失败，请检查网络')
  }
}

// 触发 AI 润色
const handleAiPolish = async () => {
  if (!currentReview.value.reflection || currentReview.value.reflection.trim() === '') {
    alert('请先写几句简单的复盘内容，AI 才能帮你润色哦！')
    return
  }

  isPolishing.value = true
  try {
    // 拦截器已经解包，返回的直接是润色后的字符串
    const res: unknown = await aiPolishApi({
      taskCount: currentReview.value.completedTaskCount || 0,
      focusProject: currentReview.value.focusProjectName || '日常事务',
      reflection: currentReview.value.reflection,
    })

    if (typeof res === 'string' && res) {
      currentReview.value.reflection = res
    }
  } catch (error) {
    console.error('AI 润色失败:', error)
    alert('AI 润色失败，请检查网络或后端日志')
  } finally {
    isPolishing.value = false
  }
}

// 监听菜单切换：切到 review 时加载数据
watch(currentView, (newVal) => {
  if (newVal === 'review') {
    loadReviewData()
  }
})

// ================== AI 智能规划逻辑 ==================
const aiForm = ref({ target: '', description: '', duration: '' })
const isGeneratingPlan = ref(false)
const generatedPlan = ref<any[]>([]) // 存储后端的 List<MilestoneDraftVO>
const isApplying = ref(false)

// 1. 调用 AI 生成草稿
const generatePlan = async () => {
  if (!aiForm.value.target || !aiForm.value.duration) {
    alert('请至少填写目标和期望周期！')
    return
  }
  isGeneratingPlan.value = true
  generatedPlan.value = []
  try {
    const res: any = await aiBreakdownApi(aiForm.value)
    // 假设拦截器剥离了 data，如果没剥离，请自行加上 .data
    generatedPlan.value = res || []
  } catch (error) {
    alert('AI 拆解失败，请检查网络或后端日志')
  } finally {
    isGeneratingPlan.value = false
  }
}

// 2. 将生成的草稿一键导入数据库 (核心联动)
const applyPlanToSystem = async () => {
  if (generatedPlan.value.length === 0) return

  const isConfirm = window.confirm(`确定要将这个计划作为新清单导入到系统中吗？`)
  if (!isConfirm) return

  isApplying.value = true
  try {
    // 步骤 A: 创建新项目 (清单)
    const newProjectName = `[AI] ${aiForm.value.target}`
    // ⚠️ 注意：这里假设你之前的 addProjectApi 返回的是新项目的 ID 或者对象
    // 如果你的接口只返回 true，你可能需要重新请求 loadProjects() 然后拿到最后一个项目的 ID
    const projectRes: any = await addProjectApi({ name: newProjectName, icon: '✨' })
    const newProjectId = projectRes?.id || projectRes // 视你后端的真实返回结构而定，如果返回的是对象就取 .id

    // 如果没有拿到 projectId，需要你手动改一下逻辑，或者直接提示成功然后让用户自己去左侧找
    if (!newProjectId || newProjectId === true) {
      await loadProjects() // 重新拉取左侧列表
      alert(
        '🎉 AI 计划生成完毕！请在左侧清单列表中查看 (由于接口限制，任务暂未自动关联，建议后端增加一键导入接口)',
      )
      isApplying.value = false
      return
    }

    // （可选完整实现：如果你的 addProjectApi 能正确返回 ID，这里可以用 for 循环调用 addMilestoneApi 和 addTaskApi 将数据逐个塞进去。为了避免前端循环请求太慢，其实企业级做法是让后端写一个 /ai/apply 接口一次性入库。在这里，只要你保证左侧列表刷新了即可作为 MVP 跑通验证）。
    for (let mIndex = 0; mIndex < generatedPlan.value.length; mIndex++) {
      const milestoneDraft = generatedPlan.value[mIndex]
      const milestoneRes: any = await addMilestoneApi({
        name: milestoneDraft.name,
        projectId: String(newProjectId),
        orderNo: mIndex,
      })
      const newMilestoneId = milestoneRes?.id || milestoneRes

      for (const task of milestoneDraft.tasks || []) {
        await addTaskApi({
          title: task.title,
          description: task.description || '',
          projectId: String(newProjectId),
          priority: 0,
          milestoneId: newMilestoneId ? String(newMilestoneId) : undefined,
        })
      }
    }

    await loadProjects()
    currentView.value = 'tasks'
    alert('🎉 导入成功！')
  } catch (error) {
    alert('导入系统时出现异常')
  } finally {
    isApplying.value = false
    // 初始化表单
    aiForm.value = { target: '', description: '', duration: '' }
    generatedPlan.value = []
  }
}
</script>
