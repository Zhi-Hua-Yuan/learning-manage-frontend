<template>
  <div class="relative flex min-h-full flex-1 bg-[var(--color-bg-page)]">
    <main class="flex min-w-0 flex-1 flex-col bg-[var(--color-bg-page)]">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 sm:px-5"
      >
        <div class="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
          <AppIcon
            v-if="isAggregateView"
            name="calendar"
            class="mr-1 inline h-5 w-5 align-[-2px]"
          />
          <AppIcon
            v-else-if="selectedProject"
            :name="getProjectIconName(selectedProject.icon)"
            class="mr-1 inline h-5 w-5 align-[-2px]"
          />
          <span>{{ pageTitle }}</span>
          <span
            v-if="!isAggregateView && selectedProjectColor"
            class="h-2.5 w-2.5 shrink-0 rounded-full border border-white/70"
            :style="{ backgroundColor: selectedProjectColor }"
          ></span>
        </div>

        <div
          v-if="shouldRenderBoardData && !isAggregateView && selectedProjectId && taskList.length > 0"
          class="flex w-full items-center gap-3 sm:w-56"
        >
          <span class="mono text-xs text-[var(--color-text-secondary)]">完成度 {{ projectProgress }}%</span>
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-surface-secondary)]">
            <div
              class="h-full bg-[var(--color-success)] transition-all duration-500"
              :style="{ width: projectProgress + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div
        v-if="!isAggregateView"
        class="relative z-[var(--z-content-sticky)] border-b border-[var(--color-border-default)] px-4 py-3 sm:px-5"
      >
        <div class="card-base flex flex-col gap-2 bg-[var(--color-bg-surface)] p-3 sm:flex-row sm:items-center">
          <div class="flex min-w-0 flex-1 items-center">
            <span class="mr-2 text-lg font-bold text-[var(--color-text-tertiary)]">+</span>
            <input
              ref="newTaskTitleInputRef"
              v-model="newTaskTitle"
              @keyup.enter="addTask"
              @focus="onNewTaskInputFocus"
              @blur="onNewTaskInputBlur"
              type="text"
              maxlength="50"
              placeholder="输入任务标题（最多 50 字），按回车保存"
              class="w-full min-w-0 bg-transparent text-sm text-[var(--color-text-body)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            />
            <button
              v-if="isInputFocused"
              type="button"
              class="ml-1 shrink-0 rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-surface-secondary)]"
              @mousedown.prevent="toggleNewTaskFlagMenu"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path>
              </svg>
            </button>
            <button
              v-if="isInputFocused"
              type="button"
              class="shrink-0 rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-surface-secondary)]"
              @mousedown.prevent="toggleNewTaskMoreOptions"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>

          <!-- Flag Menu Popup - shows milestone/stage options -->
          <div
            v-if="isNewTaskFlagMenuOpen"
            ref="newTaskFlagMenuRef"
            @click.stop
            @pointerdown.stop
            class="surface-panel absolute right-0 top-full z-[var(--z-dropdown)] mt-2 w-48 overflow-hidden rounded-lg py-1"
          >
            <button
              v-for="option in milestoneOptions"
              :key="option.value ?? 'default'"
              @click="selectNewTaskMilestone(option.value)"
              class="interactive-row flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
            >
              <span class="truncate text-[var(--color-text-body)]">{{ option.label }}</span>
              <svg
                v-if="(option.value === null && newTaskMilestoneId === '') || newTaskMilestoneId === option.value"
                class="ml-auto h-4 w-4 text-[var(--color-text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </button>
          </div>

          <!-- More Options Panel -->
          <div
            v-if="isNewTaskMoreOptionsOpen"
            ref="newTaskMoreOptionsRef"
            @click.stop
            @pointerdown.stop
            class="surface-panel absolute right-0 top-full z-[var(--z-dropdown)] mt-2 w-72 rounded-lg py-2"
          >
            <!-- Priority Dots Row -->
            <div class="flex items-center gap-3 px-3 py-2">
              <span class="text-sm text-[var(--color-text-secondary)]">优先级</span>
              <div class="flex gap-2">
                <button
                  v-for="option in priorityOptions"
                  :key="option.value"
                  @click="setNewTaskPriority(option.value)"
                  type="button"
                  class="priority-dot"
                  :class="[option.dotClass, newTaskPriority === option.value ? 'ring-2 ring-offset-1' : '']"
                />
              </div>
            </div>

            <!-- Due Date Row -->
            <div class="flex items-center gap-3 px-3 py-2">
              <span class="text-sm text-[var(--color-text-secondary)]">截止日期</span>
              <button type="button" @click="openNewTaskDueDatePicker" class="text-sm text-[var(--color-text-body)]">
                {{ newTaskDueDateLabel }}
              </button>
            </div>

            <!-- Mode Toggle -->
            <div class="flex items-center justify-between px-3 py-2 border-t">
              <span class="text-sm text-[var(--color-text-secondary)]">详细模式</span>
              <span class="text-xs text-[var(--color-text-tertiary)]">(暂不可用)</span>
            </div>
          </div>
        </div>
      </div>

      <Transition name="content-fade" mode="out-in">
        <div :key="boardTransitionKey" class="flex-1 overflow-y-auto p-3 sm:p-4">
          <div v-if="shouldRenderBoardData" class="space-y-4">
            <section v-if="groupedTasks.unassigned.length > 0" class="space-y-2">
            <h3 class="px-1 text-xs font-semibold tracking-wide text-[var(--color-text-secondary)]">
              {{ mainTaskSectionTitle }}
            </h3>
            <div class="space-y-2">
              <div
                v-for="task in groupedTasks.unassigned"
                :key="task.id"
                @click="selectTask(task)"
                class="card-base group flex cursor-pointer items-center gap-3 bg-[var(--color-bg-surface)] px-3 py-3"
                :class="
                  selectedTask?.id === task.id
                    ? 'bg-[var(--color-task-selected-bg)] ring-2 ring-[var(--color-task-selected-ring)] ring-offset-1 ring-offset-[var(--color-task-selected-offset)]'
                    : ''
                "
                :style="{ borderColor: getTaskItemBorderColor(task.priority) }"
              >
                <div
                  class="flex h-5 w-5 items-center justify-center rounded border transition-colors"
                  :class="
                    isTaskCompleted(task.status)
                      ? 'border-[var(--color-border-strong)] bg-[var(--color-bg-surface-secondary)]'
                      : 'border-[var(--color-input-border)] group-hover:border-[var(--color-border-strong)]'
                  "
                  :style="{ borderColor: getTaskCheckboxBorderColor(task.status) }"
                  @click.stop="toggleTaskStatus(task)"
                >
                  <svg
                    v-if="isTaskCompleted(task.status)"
                    class="h-3 w-3 text-[var(--color-text-secondary)]"
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
                  class="min-w-0 flex-1 text-sm transition-colors"
                  :class="
                    isTaskCompleted(task.status)
                      ? 'text-[var(--color-text-tertiary)] line-through'
                      : 'text-[var(--color-text-primary)]'
                  "
                >
                  {{ task.title }}
                </span>

                <div class="flex shrink-0 items-center gap-2">
                  <span
                    v-if="isAggregateView"
                    class="inline-flex max-w-36 cursor-pointer items-center gap-1 rounded-full bg-[var(--color-bg-surface-muted)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-body)]"
                    @click="navigateToProject(task.projectId)"
                  >
                    <AppIcon :name="getTaskProjectIcon(task)" class="h-3.5 w-3.5" />
                    <span class="truncate">{{ getTaskProjectName(task) }}</span>
                  </span>
                  <span v-if="task.dueDate" class="mono text-xs text-[var(--color-text-secondary)]">
                    {{ formatTaskDueDate(task.dueDate) }}
                  </span>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-surface-muted)] px-2 py-1 text-xs font-medium"
                    :class="getPriorityOption(task.priority).textClass"
                  >
                    <span class="priority-dot" :class="getPriorityOption(task.priority).dotClass"></span>
                    {{ getPriorityOption(task.priority).text }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div
            v-if="isAggregateView && groupedTasks.unassigned.length === 0"
            class="rounded-md border border-dashed border-[var(--color-input-border)] bg-[var(--color-bg-surface)] px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]"
          >
            {{ isWeekView ? '本周还没有截止日期在本周的任务' : '今天还没有截止日期为今天的任务' }}
          </div>

          <section
            v-for="group in groupedTasks.milestones"
            :key="group.milestone.id"
            class="card-base space-y-3 bg-[var(--color-bg-surface)] p-3 sm:p-4"
          >
            <div class="group relative flex flex-wrap items-center justify-between gap-3">
              <div
                v-if="editingMilestoneId === group.milestone.id"
                class="flex min-w-0 flex-1 items-center gap-2"
              >
                <AppIcon name="flag" class="h-4 w-4 text-[var(--color-text-secondary)]" />
                <input
                  v-model="editMilestoneName"
                  @keyup.enter="saveMilestone(group.milestone)"
                  @blur="saveMilestone(group.milestone)"
                  v-focus
                  type="text"
                  class="focus-ring w-full rounded border border-[var(--color-input-border-focus)] px-2 py-1 text-sm font-semibold text-[var(--color-text-primary)]"
                />
              </div>

              <h3 v-else class="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
                <AppIcon name="flag" class="h-4 w-4 text-[var(--color-text-secondary)]" />
                <span class="truncate">{{ group.milestone.name }}</span>

                <div
                  class="ml-1 flex items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  <button
                    @click="startEditMilestone(group.milestone)"
                    class="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-body)]"
                    title="重命名"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    @click="requestDeleteMilestone(group.milestone.id, group.milestone.name)"
                    class="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                    title="删除阶段"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              <div class="flex w-full items-center gap-2 sm:w-28">
                <span class="mono text-xs text-[var(--color-text-secondary)]">{{ group.progress }}%</span>
                <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-surface-secondary)]">
                  <div
                    class="h-full bg-[var(--color-primary)] transition-all duration-500"
                    :style="{ width: group.progress + '%' }"
                  ></div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div
                v-if="group.tasks.length === 0"
                class="rounded-md border border-dashed border-[var(--color-input-border)] bg-[var(--color-bg-surface-muted)] px-3 py-4 text-center text-sm text-[var(--color-text-secondary)]"
              >
                该阶段暂无任务
              </div>

              <div
                v-for="task in group.tasks"
                :key="task.id"
                @click="selectTask(task)"
                class="card-base group flex cursor-pointer items-center gap-3 bg-[var(--color-bg-surface)] px-3 py-3"
                :class="
                  selectedTask?.id === task.id
                    ? 'bg-[var(--color-task-selected-bg)] ring-2 ring-[var(--color-task-selected-ring)] ring-offset-1 ring-offset-[var(--color-task-selected-offset)]'
                    : ''
                "
                :style="{ borderColor: getTaskItemBorderColor(task.priority) }"
              >
                <div
                  class="flex h-5 w-5 items-center justify-center rounded border transition-colors"
                  :class="
                    isTaskCompleted(task.status)
                      ? 'border-[var(--color-border-strong)] bg-[var(--color-bg-surface-secondary)]'
                      : 'border-[var(--color-input-border)] group-hover:border-[var(--color-border-strong)]'
                  "
                  :style="{ borderColor: getTaskCheckboxBorderColor(task.status) }"
                  @click.stop="toggleTaskStatus(task)"
                >
                  <svg
                    v-if="isTaskCompleted(task.status)"
                    class="h-3 w-3 text-[var(--color-text-secondary)]"
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
                  class="min-w-0 flex-1 text-sm transition-colors"
                  :class="
                    isTaskCompleted(task.status)
                      ? 'text-[var(--color-text-tertiary)] line-through'
                      : 'text-[var(--color-text-primary)]'
                  "
                >
                  {{ task.title }}
                </span>

                <div class="flex shrink-0 items-center gap-2">
                  <span
                    v-if="isAggregateView"
                    class="inline-flex max-w-36 cursor-pointer items-center gap-1 rounded-full bg-[var(--color-bg-surface-muted)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-body)]"
                    @click="navigateToProject(task.projectId)"
                  >
                    <AppIcon :name="getTaskProjectIcon(task)" class="h-3.5 w-3.5" />
                    <span class="truncate">{{ getTaskProjectName(task) }}</span>
                  </span>
                  <span v-if="task.dueDate" class="mono text-xs text-[var(--color-text-secondary)]">
                    {{ formatTaskDueDate(task.dueDate) }}
                  </span>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-surface-muted)] px-2 py-1 text-xs font-medium"
                    :class="getPriorityOption(task.priority).textClass"
                  >
                    <span class="priority-dot" :class="getPriorityOption(task.priority).dotClass"></span>
                    {{ getPriorityOption(task.priority).text }}
                  </span>
                </div>
              </div>
            </div>
          </section>

            <div v-if="!isAggregateView" class="pt-1">
            <div v-if="isAddingMilestone" class="card-base border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] p-1">
              <input
                v-model="newMilestoneName"
                @keyup.enter="submitNewMilestone"
                @blur="isAddingMilestone = false"
                autofocus
                type="text"
                placeholder="输入阶段名称，按回车保存"
                class="w-full bg-transparent px-3 py-2 text-sm text-[var(--color-text-body)] outline-none placeholder:text-[var(--color-text-tertiary)]"
              />
            </div>

            <button
              v-else
              @click="openAddMilestoneInput"
              class="card-base w-full border-dashed border-[var(--color-input-border)] bg-[var(--color-bg-surface-muted)] py-3 text-sm font-medium text-[var(--color-text-body)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface-secondary)]"
            >
              + 添加阶段
            </button>
            </div>
          </div>

          <div v-else-if="shouldShowBoardSkeleton" class="space-y-3" aria-live="polite">
            <div class="card-base space-y-3 bg-[var(--color-bg-surface)] p-3 sm:p-4">
              <div class="h-4 w-1/3 animate-pulse rounded bg-[var(--color-bg-surface-muted)]"></div>
              <div class="space-y-2">
                <div
                  v-for="index in 5"
                  :key="`task-skeleton-${index}`"
                  class="flex items-center gap-3 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-bg-surface)] px-3 py-3"
                >
                  <div class="h-5 w-5 animate-pulse rounded border border-[var(--color-input-border)]"></div>
                  <div class="h-3 w-2/3 animate-pulse rounded bg-[var(--color-bg-surface-muted)]"></div>
                  <div class="ml-auto h-3 w-12 animate-pulse rounded bg-[var(--color-bg-surface-muted)]"></div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="space-y-3">
            <div class="card-base bg-[var(--color-bg-surface)] p-4 sm:p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-[var(--color-text-secondary)]">
                  {{ shouldShowSlowState ? '加载较慢，正在继续获取最新任务。' : boardErrorMessage }}
                </p>
                <button
                  type="button"
                  class="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold"
                  @click="retryCurrentContextLoad"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </main>

    <div
      v-if="!isMobile"
      class="-ml-1 z-[var(--z-resizer)] w-1 cursor-col-resize bg-transparent transition-all hover:w-1.5 hover:bg-[var(--color-primary-soft-2)]"
      @mousedown="startResizeRight"
    ></div>

    <aside
      v-if="selectedTask || !isMobile"
      class="z-[var(--z-content-sticky)] flex flex-col bg-[var(--color-bg-surface)]"
      :class="
        isMobile
          ? 'fixed inset-0 w-full border-l-0'
          : 'border-l border-[var(--color-border-default)] shadow-[var(--shadow-card)]'
      "
      :style="isMobile ? undefined : { width: detailWidth + 'px' }"
    >
      <template v-if="selectedTask">
        <div class="flex items-center justify-between border-b border-[var(--color-divider-muted)] p-4 text-[var(--color-text-body)]">
          <div class="flex items-center gap-2">
            <button
              v-if="isMobile"
              @click="closeDetail"
              class="rounded-md p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
              title="返回列表"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="text-sm font-semibold">任务详情</span>
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="requestDeleteTask"
              class="rounded p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
              title="删除任务"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              class="rounded p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
              title="关闭详情"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto p-4">
          <div class="space-y-1">
            <textarea
              ref="detailTitleInputRef"
              :value="selectedTask.title"
              maxlength="50"
              rows="1"
              @input="onDetailTitleInput"
              @blur="onTextBlur"
              class="w-full resize-none overflow-hidden bg-transparent text-xl font-bold leading-8 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
              placeholder="请输入任务标题（最多 50 字）"
            ></textarea>
            <p v-if="!selectedTask.title.trim()" class="text-xs text-[var(--color-warning)]">
              任务标题不能为空，最多 50 字。
            </p>
          </div>

          <div
            ref="priorityRowRef"
            class="relative flex items-center gap-3 border-y border-[var(--color-divider-muted)] py-3"
          >
            <svg class="h-5 w-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-1 6-1 1H11.5l-1-1H5v12"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-[var(--color-text-secondary)]">优先级</label>
            <div class="relative min-w-0 flex-1">
              <button
                type="button"
                @click.stop="togglePriorityMenu"
                class="task-detail-select-trigger"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="priority-dot" :class="currentPriorityObj.dotClass"></span>
                  <span class="truncate text-sm font-medium" :class="currentPriorityObj.textClass">
                    {{ currentPriorityObj.text }}
                  </span>
                </span>
                <svg class="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <div
                v-if="isPriorityMenuOpen"
                @click.stop
                class="surface-panel absolute left-0 top-full z-[var(--z-dropdown)] mt-2 w-full overflow-hidden rounded-lg py-1"
              >
                <button
                  v-for="option in priorityOptions"
                  :key="option.value"
                  @click="selectPriority(option.value)"
                  class="interactive-row flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                >
                  <span class="priority-dot" :class="option.dotClass"></span>
                  <span class="font-medium" :class="option.textClass">{{ option.text }}</span>
                  <svg
                    v-if="selectedTask.priority === option.value"
                    class="ml-auto h-4 w-4 text-[var(--color-text-secondary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div
            ref="dueDateRowRef"
            class="flex items-center gap-3 border-b border-[var(--color-divider-muted)] py-3"
          >
            <svg class="h-5 w-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-[var(--color-text-secondary)]">截止日期</label>

            <div class="relative min-w-0 flex-1">
              <button
                type="button"
                @click="openDueDatePicker"
                class="task-detail-select-trigger text-left"
              >
                <span
                  class="min-w-0 flex-1 truncate text-sm"
                  :class="
                    currentDueDateLabel !== '设置截止日期'
                      ? 'text-[var(--color-text-body)]'
                      : 'text-[var(--color-text-tertiary)]'
                  "
                >
                  {{ currentDueDateLabel }}
                </span>
                <svg
                  class="pointer-events-none h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <div
                v-if="isDueDatePickerOpen"
                @click.stop
                class="surface-panel absolute left-0 top-full z-[var(--z-dropdown)] mt-2 w-[280px] max-w-full rounded-lg p-3"
              >
                <div class="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    @click="shiftCalendarMonth(-1)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
                    aria-label="上个月"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                  </button>
                  <span class="mono text-sm font-medium text-[var(--color-text-primary)]">
                    {{ currentCalendarMonthLabel }}
                  </span>
                  <button
                    type="button"
                    @click="shiftCalendarMonth(1)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
                    aria-label="下个月"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </button>
                </div>

                <div class="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-text-tertiary)]">
                  <span v-for="weekday in calendarWeekdayLabels" :key="weekday" class="py-1">{{ weekday }}</span>
                </div>

                <div class="grid grid-cols-7 gap-1">
                  <button
                    v-for="cell in calendarCells"
                    :key="cell.key"
                    type="button"
                    @click="selectDueDate(cell.iso)"
                    class="h-8 rounded-md text-sm transition-colors"
                    :class="
                      cell.isSelected
                        ? 'bg-[var(--color-primary)] text-[var(--color-text-on-accent)]'
                        : cell.isToday
                          ? 'border border-[var(--color-primary)] text-[var(--color-primary)]'
                          : cell.inCurrentMonth
                            ? 'text-[var(--color-text-body)] hover:bg-[var(--color-menu-hover)]'
                            : 'text-[var(--color-text-tertiary)] opacity-60 hover:bg-[var(--color-bg-surface-muted)]'
                    "
                  >
                    {{ cell.day }}
                  </button>
                </div>

                <div class="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    @click="clearDueDate"
                    class="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    清空
                  </button>
                  <button
                    type="button"
                    @click="selectTodayDueDate"
                    class="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                  >
                    今天
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!isAggregateView"
            ref="milestoneRowRef"
            class="relative flex items-center gap-3 border-b border-[var(--color-divider-muted)] py-3"
          >
            <svg class="h-5 w-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-[var(--color-text-secondary)]">所属阶段</label>

            <div class="relative min-w-0 flex-1">
              <button
                type="button"
                @click.stop="toggleMilestoneMenu"
                class="task-detail-select-trigger"
              >
                <span class="truncate text-sm text-[var(--color-text-body)]">{{ currentMilestoneLabel }}</span>
                <svg class="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <div
                v-if="isMilestoneMenuOpen"
                @click.stop
                class="surface-panel absolute left-0 top-full z-[var(--z-dropdown)] mt-2 max-h-56 w-full overflow-y-auto rounded-lg py-1"
              >
                <button
                  v-for="option in milestoneOptions"
                  :key="option.value || 'milestone-default'"
                  @click="selectMilestone(option.value)"
                  class="interactive-row flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                >
                  <span class="truncate text-[var(--color-text-body)]">{{ option.label }}</span>
                  <svg
                    v-if="selectedMilestoneValue === option.value"
                    class="ml-auto h-4 w-4 text-[var(--color-text-secondary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <textarea
            ref="detailDescriptionInputRef"
            v-model="selectedTask.description"
            @input="onDetailDescriptionInput"
            @blur="onTextBlur"
            maxlength="500"
            rows="6"
            class="focus-ring min-h-[140px] w-full resize-none overflow-hidden rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-body)]"
            placeholder="补充任务说明（最多 500 字）"
          ></textarea>
        </div>
      </template>

      <template v-else>
        <div class="flex h-full flex-col items-center justify-center px-4 text-[var(--color-text-tertiary)]">
          <svg class="mb-4 h-16 w-16 text-[var(--color-text-tertiary)] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            ></path>
          </svg>
          <p class="text-sm">请选择任务查看详情</p>
        </div>
      </template>
    </aside>

    <AppConfirmDialog
      v-model="showDeleteTaskConfirm"
      variant="danger"
      icon-name="trash"
      :title="deleteTaskConfirmTitle"
      message="删除后可在 5 秒内撤销。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDeleteTask"
    />

    <AppConfirmDialog
      v-model="showDeleteMilestoneConfirm"
      variant="danger"
      icon-name="trash"
      :title="deleteMilestoneConfirmTitle"
      message="该阶段下的任务不会被删除，但会变回未分配状态。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDeleteMilestone"
    />

    <transition name="completion-overlay">
      <div
        v-if="showCompletionQualityModal && pendingCompletionTask"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="选择任务完成情况"
      >
        <div class="completion-backdrop absolute inset-0" @click="closeCompletionQualityModal">
          <div class="completion-backdrop-base absolute inset-0"></div>
          <div class="completion-backdrop-blur absolute inset-0"></div>
        </div>

        <div
          class="completion-panel surface-panel relative z-[var(--z-modal-panel)] w-full max-w-md overflow-hidden rounded-2xl"
          @click.stop
        >
          <div class="completion-header h-1.5 w-full"></div>
          <div class="p-6 text-center">
            <div
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-soft-2)] text-[var(--color-primary)]"
            >
              <AppIcon name="target" class="h-7 w-7" />
            </div>
            <h3 class="text-xl font-bold text-[var(--color-text-primary)]">选择完成情况</h3>
            <p class="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              任务「{{ pendingCompletionTask.title }}」本次完成情况是？
            </p>
            <div class="mt-5 grid grid-cols-3 gap-3">
              <button
                v-for="option in completionQualityOptions"
                :key="option.status"
                type="button"
                class="completion-option focus-ring rounded-xl px-2 py-3 transition-all"
                :class="option.toneClass"
                @click="confirmCompletionQuality(option.status)"
              >
                <span class="block text-3xl leading-none">{{ option.emoji }}</span>
                <span class="mt-2 block text-base font-semibold">{{ option.label }}</span>
              </button>
            </div>
          </div>

          <div class="flex justify-end p-4 pt-0">
            <button type="button" class="btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold" @click="closeCompletionQualityModal">
              取消
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'
import { fetchProjectList } from '@/api/project'
import { addTaskApi, deleteTaskApi, fetchTaskList, updateTaskApi } from '@/api/task'
import {
  addMilestoneApi,
  deleteMilestoneApi,
  fetchMilestoneList,
  updateMilestoneApi,
} from '@/api/milestone'
import { useToast } from '@/composables/useToast'
import { useUndoDelete } from '@/composables/useUndoDelete'
import { readProjectListCache, writeProjectListCache } from '@/utils/projectCache'
import {
  offProjectListUpdated,
  onProjectListUpdated,
  type ProjectListUpdatedDetail,
} from '@/utils/projectEvents'
import {
  readAllProjectsTaskCache,
  readTaskCache,
  removeTaskFromCaches,
  syncAggregateTaskCacheByProject,
  upsertTaskInCaches,
  writeAggregateTaskCacheFromRecords,
  writeTaskCache,
} from '@/utils/taskCache'
import {
  readSelectedProjectIdCache,
  writeSelectedProjectIdCache,
} from '@/utils/appCache'
import {
  isTaskCompleted,
  TASK_STATUS_DONE_BASIC,
  TASK_STATUS_DONE_EXCELLENT,
  TASK_STATUS_DONE_STANDARD,
  TASK_STATUS_TODO,
} from '@/utils/taskStatus'

interface Task {
  id: string
  title: string
  description?: string
  status: number
  priority: number
  projectId: string
  dueDate?: string | null
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
  color?: string
}

interface PriorityOption {
  value: number
  text: string
  dotClass: string
  textClass: string
}

interface CompletionQualityOption {
  status: number
  label: string
  emoji: string
  toneClass: string
}

interface CalendarCell {
  key: string
  iso: string
  day: number
  inCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
}

interface LoadOptions {
  forceRefresh?: boolean
}

type DisplayPhase = 'loading' | 'slow' | 'ready' | 'error'
type LoadOutcomeStatus = 'ok' | 'stale' | 'error'

interface LoadOutcome {
  status: LoadOutcomeStatus
  error?: unknown
}

interface ContextLoadOptions {
  forceProjectRefresh?: boolean
  forceMilestoneRefresh?: boolean
  forceTaskRefresh?: boolean
}

const PROJECT_LIST_EVENT_SOURCE = 'task-list'
const AGGREGATE_PAGE_SIZE = 100
const AGGREGATE_MAX_PAGES = 200
const BOARD_SLOW_THRESHOLD_MS = 1200
const PROJECT_CONTEXT_PREFIX = 'project:'
const AGGREGATE_CONTEXT_PREFIX = 'aggregate:'
const DEFAULT_BOARD_ERROR_MESSAGE = '加载失败，请稍后重试。'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const undoDelete = useUndoDelete()

const projectList = ref<Project[]>([])
const taskList = ref<Task[]>([])
const selectedTask = ref<Task | null>(null)
const milestoneList = ref<Milestone[]>([])
const selectedProjectId = ref('')
const isTodayView = computed(() => route.query.view === 'today')
const isWeekView = computed(() => route.query.view === 'week')
const isAggregateView = computed(() => isTodayView.value || isWeekView.value)
const boardView = computed(() =>
  route.query.view === 'today' || route.query.view === 'week' ? route.query.view : 'project',
)
const boardTransitionKey = computed(() =>
  boardView.value === 'project' ? `project:${selectedProjectId.value || 'none'}` : String(boardView.value),
)
const displayContextKey = ref(`${PROJECT_CONTEXT_PREFIX}none`)
const displayPhase = ref<DisplayPhase>('loading')
const boardErrorMessage = ref(DEFAULT_BOARD_ERROR_MESSAGE)
const selectedProject = computed(() =>
  projectList.value.find((project) => project.id === selectedProjectId.value),
)
const selectedProjectColor = computed(() =>
  isAggregateView.value ? '' : normalizeProjectColorValue(selectedProject.value?.color),
)
const pageTitle = computed(() => {
  if (isTodayView.value) return '今天'
  if (isWeekView.value) return '本周'
  return selectedProject.value?.name || '请选择清单'
})
const mainTaskSectionTitle = computed(() => {
  if (isTodayView.value) return '今天任务'
  if (isWeekView.value) return '本周任务'
  return '默认列表'
})
const currentContextKey = computed(() => {
  if (isTodayView.value) return 'aggregate:today'
  if (isWeekView.value) return 'aggregate:week'
  return `project:${selectedProjectId.value || 'none'}`
})
const boardRenderPhase = computed<DisplayPhase>(() => {
  if (!isCurrentDisplayContext(currentContextKey.value)) {
    return 'loading'
  }
  return displayPhase.value
})
const shouldRenderBoardData = computed(() => boardRenderPhase.value === 'ready')
const shouldShowBoardSkeleton = computed(() => boardRenderPhase.value === 'loading')
const shouldShowSlowState = computed(() => boardRenderPhase.value === 'slow')

const newTaskTitle = ref('')
const newTaskMilestoneId = ref('')
const isAddingMilestone = ref(false)
const newMilestoneName = ref('')
const editingMilestoneId = ref('')
const editMilestoneName = ref('')

const isPriorityMenuOpen = ref(false)
const isDueDatePickerOpen = ref(false)
const isMilestoneMenuOpen = ref(false)
const isNewTaskMilestoneMenuOpen = ref(false)
const isNewTaskFlagMenuOpen = ref(false)
const isNewTaskMoreOptionsOpen = ref(false)
const newTaskPriority = ref(0)
const newTaskDueDate = ref<string | null>(null)
const isInputFocused = ref(false)
const showDeleteTaskConfirm = ref(false)
const showDeleteMilestoneConfirm = ref(false)
const showCompletionQualityModal = ref(false)
const pendingDeleteTask = ref<Task | null>(null)
const pendingDeleteMilestone = ref<{ id: string; name: string } | null>(null)
const pendingCompletionTask = ref<Task | null>(null)
const priorityRowRef = ref<HTMLElement | null>(null)
const dueDateRowRef = ref<HTMLElement | null>(null)
const milestoneRowRef = ref<HTMLElement | null>(null)
const newTaskFlagMenuRef = ref<HTMLElement | null>(null)
const newTaskMoreOptionsRef = ref<HTMLElement | null>(null)
const newTaskTitleInputRef = ref<HTMLInputElement | null>(null)
const detailTitleInputRef = ref<HTMLTextAreaElement | null>(null)
const detailDescriptionInputRef = ref<HTMLTextAreaElement | null>(null)
const detailWidth = ref(Number(localStorage.getItem('tick_detailWidth')) || 340)
const isResizingRight = ref(false)
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const projectLoadVersion = ref(0)
const taskLoadVersion = ref(0)
const milestoneLoadVersion = ref(0)
const milestoneCacheByProject = ref<Record<string, Milestone[]>>({})

const isMobile = computed(() => viewportWidth.value < 768)
let boardSlowTimer: ReturnType<typeof setTimeout> | null = null

const PROJECT_ICON_FALLBACK: IconName = 'folder'
const PROJECT_ICON_COMPAT_MAP: Record<string, IconName> = {
  folder: 'folder',
  '📁': 'folder',
  sparkles: 'sparkles',
  '✨': 'sparkles',
  flag: 'flag',
  '🏁': 'flag',
  star: 'star',
  '⭐': 'star',
  '🌟': 'star',
  book: 'book',
  '📚': 'book',
  target: 'target',
  '🎯': 'target',
  heart: 'heart',
  '❤️': 'heart',
  '❤': 'heart',
  work: 'work',
  '💼': 'work',
  rocket: 'rocket',
  '🚀': 'rocket',
}

const normalizeProjectColorValue = (color?: string | null) => {
  if (!color) return ''
  const normalized = color.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : ''
}

const getProjectIconName = (icon: string | undefined): IconName => {
  return PROJECT_ICON_COMPAT_MAP[icon || ''] || PROJECT_ICON_FALLBACK
}

const projectById = computed(() => {
  const map = new Map<string, Project>()
  projectList.value.forEach((project) => {
    map.set(String(project.id), project)
  })
  return map
})

const getTaskProjectName = (task: Task) => projectById.value.get(String(task.projectId))?.name || '未命名清单'
const getTaskProjectIcon = (task: Task): IconName =>
  getProjectIconName(projectById.value.get(String(task.projectId))?.icon)

const priorityOptions: PriorityOption[] = [
  { value: 3, text: '高', dotClass: 'priority-dot--urgent', textClass: 'priority-text--urgent' },
  { value: 2, text: '中', dotClass: 'priority-dot--high', textClass: 'priority-text--high' },
  { value: 1, text: '低', dotClass: 'priority-dot--low', textClass: 'priority-text--low' },
  { value: 0, text: '无', dotClass: 'priority-dot--medium', textClass: 'priority-text--medium' },
]

const getPriorityOption = (priority: number) =>
  priorityOptions.find((option) => option.value === priority) || priorityOptions[priorityOptions.length - 1]!

const completionQualityOptions: CompletionQualityOption[] = [
  {
    status: TASK_STATUS_DONE_BASIC,
    label: '差',
    emoji: '😢',
    toneClass: 'completion-option--danger',
  },
  {
    status: TASK_STATUS_DONE_STANDARD,
    label: '中',
    emoji: '😐',
    toneClass: 'completion-option--warning',
  },
  {
    status: TASK_STATUS_DONE_EXCELLENT,
    label: '好',
    emoji: '😄',
    toneClass: 'completion-option--success',
  },
]

const taskItemPriorityBorderColorMap: Record<number, string> = {
  3: 'var(--color-danger)',
  2: 'var(--color-warning)',
  1: 'var(--color-success)',
  0: 'var(--color-text-primary)',
}

const getTaskItemBorderColor = (priority: number) =>
  taskItemPriorityBorderColorMap[priority] || taskItemPriorityBorderColorMap[0]

const taskCheckboxCompletedBorderColorMap: Record<number, string> = {
  [TASK_STATUS_DONE_BASIC]: 'var(--color-danger)',
  [TASK_STATUS_DONE_STANDARD]: 'var(--color-warning)',
  [TASK_STATUS_DONE_EXCELLENT]: 'var(--color-success)',
}

const getTaskCheckboxBorderColor = (status: number): string | undefined => {
  if (!isTaskCompleted(status)) return undefined
  return taskCheckboxCompletedBorderColorMap[status] || 'var(--color-border-strong)'
}

const TASK_TITLE_MAX_LENGTH = 50
const TASK_DESCRIPTION_MAX_LENGTH = 500

const getTaskDueDateTimestamp = (dueDate?: string | null) => {
  if (!dueDate) return Number.POSITIVE_INFINITY
  const timestamp = new Date(dueDate).getTime()
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

const compareTaskByDueDateThenPriority = (a: Task, b: Task) => {
  const isACompleted = isTaskCompleted(a.status)
  const isBCompleted = isTaskCompleted(b.status)
  if (isACompleted !== isBCompleted) {
    return isACompleted ? 1 : -1
  }

  const dueDateDiff = getTaskDueDateTimestamp(a.dueDate) - getTaskDueDateTimestamp(b.dueDate)
  if (dueDateDiff !== 0) return dueDateDiff

  if (a.priority !== b.priority) return b.priority - a.priority
  return 0
}

const calendarWeekdayLabels = ['日', '一', '二', '三', '四', '五', '六'] as const

const normalizeTaskDueDate = (dueDate?: string | null) => {
  if (!dueDate) return ''
  const normalized = dueDate.includes('T') ? dueDate.slice(0, 10) : dueDate
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ''
}

const formatTaskDueDate = (dueDate?: string | null) => normalizeTaskDueDate(dueDate)

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

const parseDateKey = (dateKey?: string | null) => {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const getCurrentWeekRange = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = today.getDay()
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetToMonday)
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)

  return {
    startDateKey: toDateKey(weekStart),
    endDateKey: toDateKey(weekEnd),
  }
}

const filterAggregateTasks = (records: Task[]) => {
  if (isTodayView.value) {
    const todayKey = toDateKey(new Date())
    return records.filter((task) => normalizeTaskDueDate(task.dueDate) === todayKey)
  }

  if (isWeekView.value) {
    const { startDateKey, endDateKey } = getCurrentWeekRange()
    return records.filter((task) => {
      const dueDateKey = normalizeTaskDueDate(task.dueDate)
      if (!dueDateKey) return false
      return dueDateKey >= startDateKey && dueDateKey <= endDateKey
    })
  }

  return records
}

const calendarMonthCursor = ref(getMonthStart(new Date()))

const currentDueDateLabel = computed(() => normalizeTaskDueDate(selectedTask.value?.dueDate) || '设置截止日期')

const currentCalendarMonthLabel = computed(
  () => `${calendarMonthCursor.value.getFullYear()}年${calendarMonthCursor.value.getMonth() + 1}月`,
)

const calendarCells = computed<CalendarCell[]>(() => {
  const monthStart = calendarMonthCursor.value
  const firstWeekday = monthStart.getDay()
  const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - firstWeekday)
  const selectedDateKey = normalizeTaskDueDate(selectedTask.value?.dueDate) || ''
  const todayKey = toDateKey(new Date())
  const cells: CalendarCell[] = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    const dateKey = toDateKey(date)

    cells.push({
      key: `${dateKey}-${index}`,
      iso: dateKey,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDateKey,
    })
  }

  return cells
})

const syncCalendarToDueDate = () => {
  const selectedDate = parseDateKey(normalizeTaskDueDate(selectedTask.value?.dueDate))
  const baseDate = selectedDate || new Date()
  calendarMonthCursor.value = getMonthStart(baseDate)
}

const resizeTextarea = (
  textarea: HTMLTextAreaElement | null,
  options: { minHeight: number; maxHeight?: number },
) => {
  if (!textarea) return

  textarea.style.height = 'auto'
  const desiredHeight = textarea.scrollHeight
  const maxHeight = options.maxHeight ?? Number.POSITIVE_INFINITY
  const nextHeight = Math.max(options.minHeight, Math.min(desiredHeight, maxHeight))

  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY = desiredHeight > maxHeight ? 'auto' : 'hidden'
}

const syncDetailTitleHeight = () => {
  resizeTextarea(detailTitleInputRef.value, { minHeight: 44 })
}

const syncDetailDescriptionHeight = () => {
  const textarea = detailDescriptionInputRef.value
  if (!textarea) return

  const viewportLimit = Math.max(220, window.innerHeight - textarea.getBoundingClientRect().top - 20)
  resizeTextarea(textarea, { minHeight: 140, maxHeight: viewportLimit })
}

const syncDetailEditorHeights = () => {
  syncDetailTitleHeight()
  syncDetailDescriptionHeight()
}

const onDetailTitleInput = (event: Event) => {
  if (!selectedTask.value) return

  const target = event.target as HTMLTextAreaElement
  const nextTitle = target.value.slice(0, TASK_TITLE_MAX_LENGTH)
  if (target.value !== nextTitle) {
    target.value = nextTitle
  }
  selectedTask.value.title = nextTitle
  syncDetailTitleHeight()
}

const onDetailDescriptionInput = (event: Event) => {
  if (!selectedTask.value) return

  const target = event.target as HTMLTextAreaElement
  const nextDescription = target.value.slice(0, TASK_DESCRIPTION_MAX_LENGTH)
  if (target.value !== nextDescription) {
    target.value = nextDescription
  }
  selectedTask.value.description = nextDescription
  syncDetailDescriptionHeight()
}

const updateViewport = () => {
  viewportWidth.value = window.innerWidth
  syncDetailEditorHeights()
}

const startResizeRight = () => {
  if (isMobile.value) return
  isResizingRight.value = true
  document.addEventListener('mousemove', handleMouseMoveRight)
  document.addEventListener('mouseup', stopResizeRight)
  document.body.style.userSelect = 'none'
}

const handleMouseMoveRight = (e: MouseEvent) => {
  if (!isResizingRight.value || isMobile.value) return
  const newWidth = document.body.clientWidth - e.clientX
  if (newWidth > 260 && newWidth < 640) {
    detailWidth.value = newWidth
  }
}

const stopResizeRight = () => {
  isResizingRight.value = false
  document.removeEventListener('mousemove', handleMouseMoveRight)
  document.removeEventListener('mouseup', stopResizeRight)
  document.body.style.userSelect = ''
  localStorage.setItem('tick_detailWidth', detailWidth.value.toString())
}

const vFocus = {
  mounted(el: HTMLElement) {
    el.focus()
  },
}

const navigateToProject = (projectId: string) => {
  writeSelectedProjectIdCache(projectId)
  router.push({ path: '/tasks', query: { projectId } })
}

const syncSelectedProject = () => {
  if (isAggregateView.value) {
    selectedProjectId.value = ''
    return
  }

  const queryId = route.query.projectId
  if (typeof queryId === 'string' && queryId) {
    selectedProjectId.value = queryId
    writeSelectedProjectIdCache(queryId)
    return
  }

  selectedProjectId.value = readSelectedProjectIdCache()
}

const okOutcome = (): LoadOutcome => ({ status: 'ok' })
const staleOutcome = (): LoadOutcome => ({ status: 'stale' })
const errorOutcome = (error: unknown): LoadOutcome => ({ status: 'error', error })
const isCurrentDisplayContext = (contextKey: string) => displayContextKey.value === contextKey

const clearBoardSlowTimer = () => {
  if (!boardSlowTimer || typeof window === 'undefined') return
  window.clearTimeout(boardSlowTimer)
  boardSlowTimer = null
}

const armBoardSlowTimer = (contextKey: string) => {
  if (typeof window === 'undefined') return
  clearBoardSlowTimer()
  boardSlowTimer = window.setTimeout(() => {
    if (!isCurrentDisplayContext(contextKey)) return
    if (displayPhase.value !== 'loading') return
    displayPhase.value = 'slow'
  }, BOARD_SLOW_THRESHOLD_MS)
}

const getLoadErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '')
    if (message) return message
  }
  return DEFAULT_BOARD_ERROR_MESSAGE
}

const enterBoardLoading = (contextKey: string) => {
  displayContextKey.value = contextKey
  displayPhase.value = 'loading'
  boardErrorMessage.value = DEFAULT_BOARD_ERROR_MESSAGE
  armBoardSlowTimer(contextKey)
}

const markBoardReady = (contextKey: string) => {
  if (!isCurrentDisplayContext(contextKey)) return
  displayPhase.value = 'ready'
  boardErrorMessage.value = DEFAULT_BOARD_ERROR_MESSAGE
  clearBoardSlowTimer()
}

const markBoardError = (contextKey: string, error: unknown) => {
  if (!isCurrentDisplayContext(contextKey)) return
  displayPhase.value = 'error'
  boardErrorMessage.value = getLoadErrorMessage(error)
  clearBoardSlowTimer()
}

const isProjectContextKey = (contextKey: string) => contextKey.startsWith(PROJECT_CONTEXT_PREFIX)
const hasRouteProjectId = () => typeof route.query.projectId === 'string' && route.query.projectId.length > 0
const ensureSelectedProjectFromList = async () => {
  if (isAggregateView.value || selectedProjectId.value || projectList.value.length === 0) return
  const firstProject = projectList.value[0]
  if (!firstProject) return

  const firstId = firstProject.id
  selectedProjectId.value = firstId
  writeSelectedProjectIdCache(firstId)
  await router.replace({ path: '/tasks', query: { projectId: firstId } })
}

const loadProjects = async (options: LoadOptions = {}): Promise<LoadOutcome> => {
  const forceRefresh = options.forceRefresh === true
  const requestVersion = ++projectLoadVersion.value
  const cachedRecords = !forceRefresh ? readProjectListCache<Project>(0) : null

  if (cachedRecords) {
    projectList.value = cachedRecords
  }

  if (cachedRecords && !forceRefresh) {
    await ensureSelectedProjectFromList()
    return okOutcome()
  }

  try {
    const res = await fetchProjectList({ status: 0 })
    if (requestVersion !== projectLoadVersion.value) return staleOutcome()
    const records = (res as unknown as { records?: Project[] })?.records
    projectList.value = records || []
    writeProjectListCache(0, projectList.value)

    await ensureSelectedProjectFromList()
    return okOutcome()
  } catch (error) {
    console.error('加载项目失败', error)
    return errorOutcome(error)
  }
}

const syncSelectedTaskFromList = () => {
  if (selectedTask.value) {
    selectedTask.value = taskList.value.find((task) => task.id === selectedTask.value?.id) || null
  }
}

interface TaskPageResponse {
  records?: Task[]
  current?: number
  size?: number
  total?: number
}

const fetchAllTasksByProject = async (projectId: string, isStale: () => boolean) => {
  const aggregated: Task[] = []
  let page = 1

  for (let index = 0; index < AGGREGATE_MAX_PAGES; index += 1) {
    if (isStale()) return []

    const res = (await fetchTaskList({
      projectId,
      current: page,
      size: AGGREGATE_PAGE_SIZE,
    })) as unknown as TaskPageResponse

    if (isStale()) return []

    const records = Array.isArray(res.records) ? res.records : []
    if (records.length === 0) break

    aggregated.push(...records)

    const current = Number(res.current)
    const size = Number(res.size)
    const total = Number(res.total)
    const safeCurrent = Number.isFinite(current) && current > 0 ? current : page
    const safeSize = Number.isFinite(size) && size > 0 ? size : AGGREGATE_PAGE_SIZE
    const safeTotal = Number.isFinite(total) && total >= 0 ? total : null

    if (safeTotal !== null && aggregated.length >= safeTotal) break
    if (records.length < safeSize) break

    page = safeCurrent + 1
  }

  return aggregated
}

const loadTasks = async (options: LoadOptions = {}): Promise<LoadOutcome> => {
  const forceRefresh = options.forceRefresh === true
  const requestVersion = ++taskLoadVersion.value

  if (isAggregateView.value) {
    if (projectList.value.length === 0) {
      taskList.value = []
      selectedTask.value = null
      return okOutcome()
    }

    if (!forceRefresh) {
      const cachedAllProjectsTasks = readAllProjectsTaskCache()
      if (cachedAllProjectsTasks) {
        const allRecords = Object.values(cachedAllProjectsTasks).flatMap((items) =>
          Array.isArray(items) ? items : [],
        )
        taskList.value = filterAggregateTasks(allRecords).sort(compareTaskByDueDateThenPriority)
        syncSelectedTaskFromList()
        return okOutcome()
      }
    }

    try {
      const responses = await Promise.all(
        projectList.value.map((project) =>
          fetchAllTasksByProject(project.id, () => requestVersion !== taskLoadVersion.value),
        ),
      )
      if (requestVersion !== taskLoadVersion.value) return staleOutcome()
      const records = responses.flat()
      taskList.value = filterAggregateTasks(records).sort(compareTaskByDueDateThenPriority)
      writeAggregateTaskCacheFromRecords(records)
      syncSelectedTaskFromList()
      return okOutcome()
    } catch (error) {
      if (requestVersion !== taskLoadVersion.value) return staleOutcome()
      console.error('加载今日任务失败', error)
      return errorOutcome(error)
    }
  }

  if (!selectedProjectId.value) {
    taskList.value = []
    selectedTask.value = null
    return okOutcome()
  }

  if (!forceRefresh) {
    const cachedProjectTasks = readTaskCache(selectedProjectId.value)
    if (cachedProjectTasks) {
      taskList.value = cachedProjectTasks
      syncSelectedTaskFromList()
      return okOutcome()
    }
  }

  const requestProjectId = selectedProjectId.value
  try {
    const res = await fetchTaskList({
      projectId: requestProjectId,
      current: 1,
      size: 100,
    })
    if (requestVersion !== taskLoadVersion.value) return staleOutcome()
    if (requestProjectId !== selectedProjectId.value) return staleOutcome()
    const records = (res as unknown as { records?: Task[] })?.records
    taskList.value = records || []
    writeTaskCache(requestProjectId, taskList.value)
    syncAggregateTaskCacheByProject(requestProjectId, taskList.value)
    syncSelectedTaskFromList()
    return okOutcome()
  } catch (error) {
    if (requestVersion !== taskLoadVersion.value) return staleOutcome()
    console.error('加载任务失败', error)
    return errorOutcome(error)
  }
}

const loadMilestones = async (options: LoadOptions = {}): Promise<LoadOutcome> => {
  const forceRefresh = options.forceRefresh === true
  const requestVersion = ++milestoneLoadVersion.value
  if (isAggregateView.value || !selectedProjectId.value) {
    milestoneList.value = []
    return okOutcome()
  }

  const requestProjectId = selectedProjectId.value
  if (!forceRefresh && Array.isArray(milestoneCacheByProject.value[requestProjectId])) {
    milestoneList.value = [...milestoneCacheByProject.value[requestProjectId]!]
    return okOutcome()
  }

  try {
    const res = await fetchMilestoneList({ projectId: requestProjectId })
    if (requestVersion !== milestoneLoadVersion.value) return staleOutcome()
    if (requestProjectId !== selectedProjectId.value || isAggregateView.value) return staleOutcome()
    const milestones = Array.isArray(res) ? (res as Milestone[]) : []
    const sortedMilestones = milestones.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
    milestoneList.value = sortedMilestones
    milestoneCacheByProject.value = {
      ...milestoneCacheByProject.value,
      [requestProjectId]: sortedMilestones,
    }
    return okOutcome()
  } catch (error) {
    if (requestVersion !== milestoneLoadVersion.value) return staleOutcome()
    console.error('加载里程碑失败', error)
    return errorOutcome(error)
  }
}

const loadContextData = async (contextKey: string, options: ContextLoadOptions = {}) => {
  enterBoardLoading(contextKey)

  const projectContext = isProjectContextKey(contextKey)
  const projectOutcome = await loadProjects({ forceRefresh: options.forceProjectRefresh === true })
  if (!isCurrentDisplayContext(contextKey)) return

  const [milestoneOutcome, taskOutcome] = await Promise.all([
    loadMilestones({ forceRefresh: options.forceMilestoneRefresh === true }),
    loadTasks({ forceRefresh: options.forceTaskRefresh === true }),
  ])

  if (!isCurrentDisplayContext(contextKey)) return

  const outcomes = [projectOutcome, milestoneOutcome, taskOutcome]
  const failedOutcome = outcomes.find((outcome) => outcome.status === 'error')
  if (failedOutcome) {
    markBoardError(contextKey, failedOutcome.error)
    return
  }

  if (projectContext || contextKey.startsWith(AGGREGATE_CONTEXT_PREFIX)) {
    markBoardReady(contextKey)
  }
}

const retryCurrentContextLoad = async () => {
  const contextKey = currentContextKey.value
  const isProjectMode = hasRouteProjectId()
  await loadContextData(contextKey, {
    forceProjectRefresh: isProjectMode,
    forceMilestoneRefresh: isProjectMode,
    forceTaskRefresh: true,
  })
}

const handleProjectListUpdated: EventListener = (event) => {
  const customEvent = event as CustomEvent<ProjectListUpdatedDetail>
  if (customEvent.detail?.source === PROJECT_LIST_EVENT_SOURCE) return
  void loadProjects({ forceRefresh: true })
}

const addTask = async () => {
  if (!newTaskTitle.value.trim() || !selectedProjectId.value) return

  try {
    const finalTitle = newTaskTitle.value.trim().slice(0, TASK_TITLE_MAX_LENGTH)
    await addTaskApi({
      title: finalTitle,
      projectId: selectedProjectId.value,
      priority: newTaskPriority.value,
      dueDate: newTaskDueDate.value,
      milestoneId: newTaskMilestoneId.value || undefined,
    })
    newTaskTitle.value = ''
    newTaskMilestoneId.value = ''
    newTaskPriority.value = 0
    newTaskDueDate.value = null
    isInputFocused.value = false
    isNewTaskFlagMenuOpen.value = false
    isNewTaskMoreOptionsOpen.value = false
    isNewTaskMilestoneMenuOpen.value = false
    await loadTasks({ forceRefresh: true })
  } catch {
    toast.error('添加任务失败，请检查网络后重试。')
  }
}

const setTaskStatus = async (task: Task, nextStatus: number) => {
  const oldStatus = task.status
  task.status = nextStatus
  try {
    await updateTaskApi({ ...task, status: nextStatus })
    upsertTaskInCaches(task)
  } catch {
    task.status = oldStatus
    toast.error('更新状态失败，请检查网络后重试。')
    throw new Error('update-task-status-failed')
  }
}

const closeCompletionQualityModal = () => {
  showCompletionQualityModal.value = false
  pendingCompletionTask.value = null
}

const confirmCompletionQuality = async (status: number) => {
  const task = pendingCompletionTask.value
  if (!task) return
  closeCompletionQualityModal()
  try {
    await setTaskStatus(task, status)
  } catch {
    // toast already handled in setTaskStatus
  }
}

const toggleTaskStatus = async (task: Task) => {
  if (isTaskCompleted(task.status)) {
    try {
      await setTaskStatus(task, TASK_STATUS_TODO)
    } catch {
      // toast already handled in setTaskStatus
    }
    return
  }
  pendingCompletionTask.value = task
  showCompletionQualityModal.value = true
}

const selectTask = (task: Task) => {
  selectedTask.value = task
  isPriorityMenuOpen.value = false
  isDueDatePickerOpen.value = false
  isMilestoneMenuOpen.value = false
  isNewTaskMilestoneMenuOpen.value = false
}

const closeDetail = () => {
  closeDueDatePicker()
  selectedTask.value = null
  isPriorityMenuOpen.value = false
  isMilestoneMenuOpen.value = false
  isNewTaskMilestoneMenuOpen.value = false
}

const currentPriorityObj = computed(() => {
  if (!selectedTask.value) return priorityOptions[priorityOptions.length - 1]!
  return getPriorityOption(selectedTask.value.priority)
})

const currentMilestoneLabel = computed(() => {
  const milestoneId = selectedTask.value?.milestoneId
  if (!milestoneId || String(milestoneId) === '0') return '默认列表（未分配）'

  const milestone = milestoneList.value.find((item) => item.id === String(milestoneId))
  if (!milestone) return '默认列表（未分配）'

  return milestone.name
})

const milestoneOptions = computed(() => [
  { value: null, label: '默认列表（未分配）' },
  ...milestoneList.value.map((milestone) => ({
    value: String(milestone.id),
    label: milestone.name,
  })),
])

const selectedMilestoneValue = computed(() => {
  const milestoneId = selectedTask.value?.milestoneId
  if (!milestoneId || String(milestoneId) === '0') return null
  return String(milestoneId)
})

const newTaskDueDateLabel = computed(() => {
  if (!newTaskDueDate.value) return '设置截止日期'
  return formatTaskDueDate(newTaskDueDate.value)
})

const setNewTaskPriority = (priority: number) => {
  newTaskPriority.value = priority
}

const openNewTaskDueDatePicker = () => {
  isNewTaskFlagMenuOpen.value = false
  isNewTaskMoreOptionsOpen.value = false

  const input = document.createElement('input')
  input.type = 'date'
  input.value = newTaskDueDate.value || ''
  input.style.cssText = 'position:absolute;opacity:0;pointer-events:none;'

  const container = document.createElement('div')
  container.style.position = 'relative'
  container.appendChild(input)
  document.body.appendChild(container)

  if (typeof (input as HTMLInputElement).showPicker === 'function') {
    try {
      ;(input as HTMLInputElement).showPicker()
    } catch {
      input.click()
    }
  } else {
    input.click()
  }

  input.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement
    newTaskDueDate.value = target.value || null
    document.body.removeChild(container)
  })

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }, 100)
  })
}

const deleteTaskConfirmTitle = computed(() => {
  if (!pendingDeleteTask.value) return '确认删除任务？'
  return `确认删除任务“${pendingDeleteTask.value.title}”？`
})

const deleteMilestoneConfirmTitle = computed(() => {
  if (!pendingDeleteMilestone.value) return '确认删除阶段？'
  return `确认删除阶段“${pendingDeleteMilestone.value.name}”？`
})

const onNewTaskInputFocus = () => {
  isInputFocused.value = true
}

const onNewTaskInputBlur = () => {
  isInputFocused.value = false
  isNewTaskFlagMenuOpen.value = false
  isNewTaskMoreOptionsOpen.value = false
}

const toggleNewTaskFlagMenu = () => {
  isNewTaskMoreOptionsOpen.value = false
  isNewTaskFlagMenuOpen.value = !isNewTaskFlagMenuOpen.value
}

const selectNewTaskMilestone = (value: string | null) => {
  newTaskMilestoneId.value = value ?? ''
  isNewTaskFlagMenuOpen.value = false
}

const toggleNewTaskMoreOptions = () => {
  isNewTaskFlagMenuOpen.value = false
  isNewTaskMoreOptionsOpen.value = !isNewTaskMoreOptionsOpen.value
}

const togglePriorityMenu = () => {
  isNewTaskMilestoneMenuOpen.value = false
  closeDueDatePicker()
  isMilestoneMenuOpen.value = false
  isPriorityMenuOpen.value = !isPriorityMenuOpen.value
}

const toggleMilestoneMenu = () => {
  if (!selectedTask.value) return
  isNewTaskMilestoneMenuOpen.value = false
  isPriorityMenuOpen.value = false
  closeDueDatePicker()
  isMilestoneMenuOpen.value = !isMilestoneMenuOpen.value
}

const closeDueDatePicker = () => {
  isDueDatePickerOpen.value = false
}

const openDueDatePicker = () => {
  isNewTaskMilestoneMenuOpen.value = false
  isPriorityMenuOpen.value = false
  isMilestoneMenuOpen.value = false

  if (isDueDatePickerOpen.value) {
    closeDueDatePicker()
    return
  }

  syncCalendarToDueDate()
  isDueDatePickerOpen.value = true
}

const shiftCalendarMonth = (offset: number) => {
  const current = calendarMonthCursor.value
  calendarMonthCursor.value = new Date(current.getFullYear(), current.getMonth() + offset, 1)
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const targetNode = event.target as Node | null
  if (!targetNode) return

  if (isPriorityMenuOpen.value && priorityRowRef.value && !priorityRowRef.value.contains(targetNode)) {
    isPriorityMenuOpen.value = false
  }

  if (isDueDatePickerOpen.value && dueDateRowRef.value && !dueDateRowRef.value.contains(targetNode)) {
    closeDueDatePicker()
  }

  if (isMilestoneMenuOpen.value && milestoneRowRef.value && !milestoneRowRef.value.contains(targetNode)) {
    isMilestoneMenuOpen.value = false
  }

  // Close new task flag menu when clicking outside
  if (
    isNewTaskFlagMenuOpen.value &&
    newTaskFlagMenuRef.value &&
    !newTaskFlagMenuRef.value.contains(targetNode) &&
    !newTaskTitleInputRef.value?.contains(targetNode)
  ) {
    isNewTaskFlagMenuOpen.value = false
  }

  // Close more options panel when clicking outside
  if (
    isNewTaskMoreOptionsOpen.value &&
    newTaskMoreOptionsRef.value &&
    !newTaskMoreOptionsRef.value.contains(targetNode) &&
    !newTaskTitleInputRef.value?.contains(targetNode)
  ) {
    isNewTaskMoreOptionsOpen.value = false
  }
}

const selectPriority = async (val: number) => {
  if (!selectedTask.value) return

  const oldPriority = selectedTask.value.priority
  selectedTask.value.priority = val
  isPriorityMenuOpen.value = false

  try {
    await updateTaskApi({ ...selectedTask.value, priority: val })
    upsertTaskInCaches(selectedTask.value)
  } catch {
    selectedTask.value.priority = oldPriority
    toast.error('更新优先级失败，请检查网络后重试。')
  }
}

const updateDueDate = async (nextDate: string | null) => {
  if (!selectedTask.value) return

  const finalDate = nextDate || null
  const oldDate = selectedTask.value.dueDate
  const oldDateKey = normalizeTaskDueDate(oldDate) || null
  if (oldDateKey === finalDate) {
    isDueDatePickerOpen.value = false
    return
  }

  selectedTask.value.dueDate = finalDate
  isDueDatePickerOpen.value = false

  try {
    await updateTaskApi({ ...selectedTask.value, dueDate: finalDate })
    await loadTasks({ forceRefresh: true })
  } catch {
    selectedTask.value.dueDate = oldDate
    toast.error('更新日期失败，请检查网络后重试。')
  }
}

const selectDueDate = async (dateKey: string) => {
  await updateDueDate(dateKey)
}

const clearDueDate = async () => {
  await updateDueDate(null)
}

const selectTodayDueDate = async () => {
  await updateDueDate(toDateKey(new Date()))
}

const selectMilestone = async (milestoneId: string | null) => {
  if (!selectedTask.value) return

  const finalMilestoneId = milestoneId && milestoneId !== '0' ? milestoneId : null
  const oldMilestoneId = selectedTask.value.milestoneId
  if ((oldMilestoneId ?? null) === finalMilestoneId) {
    isMilestoneMenuOpen.value = false
    return
  }
  selectedTask.value.milestoneId = finalMilestoneId
  isMilestoneMenuOpen.value = false

  try {
    await updateTaskApi({ ...selectedTask.value, milestoneId: finalMilestoneId })
    await loadTasks({ forceRefresh: true })
  } catch {
    selectedTask.value.milestoneId = oldMilestoneId
    toast.error('更新所属阶段失败，请检查网络后重试。')
  }
}

const onTextBlur = async () => {
  if (!selectedTask.value) return

  try {
    await updateTaskApi({ ...selectedTask.value })
    await loadTasks({ forceRefresh: true })
  } catch (error) {
    console.error('保存任务失败', error)
    toast.error('保存失败，请检查网络后重试。')
  }
}

const requestDeleteTask = () => {
  if (!selectedTask.value) return
  pendingDeleteTask.value = { ...selectedTask.value }
  showDeleteTaskConfirm.value = true
}

const confirmDeleteTask = async () => {
  const taskToDelete = pendingDeleteTask.value
  if (!taskToDelete) return

  showDeleteTaskConfirm.value = false

  const originalIndex = taskList.value.findIndex((task) => task.id === taskToDelete.id)
  taskList.value = taskList.value.filter((task) => task.id !== taskToDelete.id)
  removeTaskFromCaches(taskToDelete)
  selectedTask.value = null

  undoDelete.scheduleUndoDelete({
    label: `任务「${taskToDelete.title}」`,
    pendingMessage: `任务「${taskToDelete.title}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteTaskApi(taskToDelete.id)
    },
    onCommitSuccess: async () => {
      await loadTasks({ forceRefresh: true })
    },
    onRollback: async () => {
      if (!taskList.value.some((task) => task.id === taskToDelete.id)) {
        const nextTasks = [...taskList.value]
        const insertIndex =
          originalIndex >= 0 && originalIndex <= nextTasks.length ? originalIndex : nextTasks.length
        nextTasks.splice(insertIndex, 0, taskToDelete)
        taskList.value = nextTasks
      }
      upsertTaskInCaches(taskToDelete)
    },
  })
}

const submitNewMilestone = async () => {
  const name = newMilestoneName.value.trim()
  if (!name || !selectedProjectId.value) {
    isAddingMilestone.value = false
    return
  }

  try {
    await addMilestoneApi({
      name,
      projectId: selectedProjectId.value,
      orderNo: milestoneList.value.length,
    })
    newMilestoneName.value = ''
    isAddingMilestone.value = false
    await loadMilestones({ forceRefresh: true })
  } catch {
    toast.error('创建阶段失败，请检查网络后重试。')
  }
}

const openAddMilestoneInput = () => {
  isAddingMilestone.value = true
  newMilestoneName.value = ''
}

const startEditMilestone = (milestone: Milestone) => {
  editingMilestoneId.value = milestone.id
  editMilestoneName.value = milestone.name
}

const saveMilestone = async (milestone: Milestone) => {
  const newName = editMilestoneName.value.trim()

  if (!newName || newName === milestone.name) {
    editingMilestoneId.value = ''
    return
  }

  try {
    await updateMilestoneApi({ ...milestone, name: newName })
    editingMilestoneId.value = ''
    await loadMilestones({ forceRefresh: true })
  } catch {
    toast.error('重命名失败，请检查网络后重试。')
  }
}

const requestDeleteMilestone = (id: string, name: string) => {
  pendingDeleteMilestone.value = { id, name }
  showDeleteMilestoneConfirm.value = true
}

const confirmDeleteMilestone = async () => {
  const target = pendingDeleteMilestone.value
  if (!target) return

  showDeleteMilestoneConfirm.value = false
  await deleteMilestone(target.id, target.name)
}

const deleteMilestone = async (id: string, name: string) => {

  const snapshot = [...milestoneList.value]
  const removedIndex = snapshot.findIndex((milestone) => milestone.id === id)
  const removedMilestone = snapshot.find((milestone) => milestone.id === id)
  if (!removedMilestone) return
  milestoneList.value = snapshot.filter((milestone) => milestone.id !== id)

  undoDelete.scheduleUndoDelete({
    label: `阶段「${name}」`,
    pendingMessage: `阶段「${name}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteMilestoneApi(id)
    },
    onCommitSuccess: async () => {
      await Promise.all([loadMilestones({ forceRefresh: true }), loadTasks({ forceRefresh: true })])
    },
    onRollback: () => {
      if (!milestoneList.value.some((milestone) => milestone.id === id)) {
        const next = [...milestoneList.value]
        const insertIndex = removedIndex >= 0 && removedIndex <= next.length ? removedIndex : next.length
        next.splice(insertIndex, 0, removedMilestone)
        milestoneList.value = next.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
      }
    },
  })
}

const projectProgress = computed(() => {
  if (taskList.value.length === 0) return 0
  const completedCount = taskList.value.filter((t) => isTaskCompleted(t.status)).length
  return Math.round((completedCount / taskList.value.length) * 100)
})

const groupedTasks = computed(() => {
  if (isAggregateView.value) {
    return {
      unassigned: [...taskList.value].sort(compareTaskByDueDateThenPriority),
      milestones: [] as { milestone: Milestone; tasks: Task[]; progress: number }[],
    }
  }

  const result = {
    unassigned: [] as Task[],
    milestones: [] as { milestone: Milestone; tasks: Task[]; progress: number }[],
  }

  milestoneList.value.forEach((m) => {
    result.milestones.push({ milestone: m, tasks: [], progress: 0 })
  })

  taskList.value.forEach((task) => {
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

  result.unassigned.sort(compareTaskByDueDateThenPriority)

  result.milestones.forEach((g) => {
    g.tasks.sort(compareTaskByDueDateThenPriority)

    if (g.tasks.length === 0) {
      g.progress = 0
    } else {
      const completedCount = g.tasks.filter((t) => isTaskCompleted(t.status)).length
      g.progress = Math.round((completedCount / g.tasks.length) * 100)
    }
  })

  return result
})

watch(
  [() => route.query.projectId, () => route.query.view],
  async () => {
    closeCompletionQualityModal()
    syncSelectedProject()
    closeDueDatePicker()
    selectedTask.value = null
    isPriorityMenuOpen.value = false
    isMilestoneMenuOpen.value = false
    isNewTaskMilestoneMenuOpen.value = false
    await loadContextData(currentContextKey.value)
  },
)

watch(
  () => selectedTask.value?.id,
  async () => {
    await nextTick()
    syncDetailEditorHeights()
  },
)

watch(showDeleteTaskConfirm, (next) => {
  if (!next) {
    pendingDeleteTask.value = null
  }
})

watch(showDeleteMilestoneConfirm, (next) => {
  if (!next) {
    pendingDeleteMilestone.value = null
  }
})

onMounted(async () => {
  updateViewport()
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('resize', updateViewport)
  onProjectListUpdated(handleProjectListUpdated)
  syncSelectedProject()
  await loadContextData(currentContextKey.value)
})

onBeforeUnmount(() => {
  closeCompletionQualityModal()
  clearBoardSlowTimer()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  stopResizeRight()
  window.removeEventListener('resize', updateViewport)
  offProjectListUpdated(handleProjectListUpdated)
})
</script>

<style scoped>
.completion-backdrop {
  overflow: hidden;
}

.completion-backdrop-base {
  background-color: var(--color-backdrop-strong);
  opacity: 1;
}

.completion-backdrop-blur {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 1;
}

.completion-panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.completion-header {
  background: var(--color-primary);
}

.completion-option {
  border: 1px solid var(--color-input-border);
  background: var(--color-bg-surface-muted);
}

.completion-option:hover {
  transform: translateY(-1px);
}

.completion-option--danger {
  color: var(--color-danger);
}

.completion-option--warning {
  color: var(--color-warning);
}

.completion-option--success {
  color: var(--color-success);
}

.completion-overlay-enter-active .completion-backdrop-base,
.completion-overlay-leave-active .completion-backdrop-base,
.completion-overlay-enter-active .completion-backdrop-blur,
.completion-overlay-leave-active .completion-backdrop-blur {
  transition: opacity 220ms var(--ease-standard);
}

.completion-overlay-enter-from .completion-backdrop-base,
.completion-overlay-leave-to .completion-backdrop-base,
.completion-overlay-enter-from .completion-backdrop-blur,
.completion-overlay-leave-to .completion-backdrop-blur {
  opacity: 0;
}

.completion-overlay-enter-active .completion-panel,
.completion-overlay-leave-active .completion-panel {
  transition:
    opacity var(--motion-base) var(--ease-standard),
    transform var(--motion-base) var(--ease-standard);
}

.completion-overlay-enter-from .completion-panel,
.completion-overlay-leave-to .completion-panel {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.completion-overlay-enter-to .completion-panel,
.completion-overlay-leave-from .completion-panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
