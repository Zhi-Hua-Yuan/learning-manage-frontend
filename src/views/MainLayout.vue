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

      <div
        class="mt-auto p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between group"
      >
        <div class="flex items-center gap-2 overflow-hidden">
          <div
            class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm"
          >
            Me
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-700 truncate">当前用户</span>
          </div>
        </div>

        <button
          @click="handleLogout"
          class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 transition-all rounded hover:bg-gray-200"
          title="退出登录"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            ></path>
          </svg>
        </button>
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
import { fetchTaskList, addTaskApi, updateTaskApi, deleteTaskApi } from '@/api/task'
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

const projectList = ref<Project[]>([])
const taskList = ref<Task[]>([])
const selectedProjectId = ref('')
const selectedTask = ref<Task | null>(null)
const milestoneList = ref<Milestone[]>([])
// 【新增：新建里程碑逻辑】
const isAddingMilestone = ref(false)
const newMilestoneName = ref('')
// 控制当前正在编辑的里程碑 ID 和绑定的名字
const editingMilestoneId = ref('')
const editMilestoneName = ref('')
// 'tasks' 表示正常任务列表，'dashboard' 表示数据大屏
const currentView = ref('tasks')

// ================== 核心联调逻辑开始 ==================

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

// 【新增：退出登录逻辑】
const handleLogout = () => {
  const isConfirm = window.confirm('确定要退出登录吗？')
  if (!isConfirm) return

  // 1. 清除本地存储的 Token
  localStorage.removeItem('token')

  // 2. 强制跳转回登录页
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
</script>
