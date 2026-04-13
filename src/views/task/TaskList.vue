<template>
  <div class="relative flex min-h-full flex-1 bg-[var(--color-bg-page)]">
    <main class="flex min-w-0 flex-1 flex-col bg-[var(--color-bg-page)]">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 sm:px-5"
      >
        <span class="text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
          {{ projectList.find((p) => p.id === selectedProjectId)?.icon }}
          {{ projectList.find((p) => p.id === selectedProjectId)?.name || '请选择清单' }}
        </span>

        <div
          v-if="selectedProjectId && taskList.length > 0"
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

      <div class="relative z-30 border-b border-[var(--color-border-default)] px-4 py-3 sm:px-5">
        <div class="card-base flex flex-col gap-2 bg-[var(--color-bg-surface)] p-3 sm:flex-row sm:items-center">
          <div class="flex min-w-0 flex-1 items-center">
            <span class="mr-2 text-lg font-bold text-[var(--color-text-tertiary)]">+</span>
            <input
              v-model="newTaskTitle"
              @keyup.enter="addTask"
              type="text"
              maxlength="50"
              placeholder="输入任务标题（最多 50 字），按回车保存"
              class="w-full min-w-0 bg-transparent text-sm text-[var(--color-text-body)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            />
          </div>

          <div ref="newTaskMilestoneMenuRef" class="relative w-full sm:w-56">
            <button
              type="button"
              class="task-detail-select-trigger"
              @click.stop="toggleNewTaskMilestoneMenu"
            >
              <span class="truncate text-sm text-[var(--color-text-body)]">{{ newTaskMilestoneLabel }}</span>
              <svg class="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            <div
              v-if="isNewTaskMilestoneMenuOpen"
              @click.stop
              class="surface-panel absolute left-0 top-full z-40 mt-2 max-h-56 w-full overflow-y-auto rounded-lg py-1"
            >
              <button
                v-for="option in newTaskMilestoneOptions"
                :key="option.value || 'new-task-milestone-default'"
                @click="selectNewTaskMilestone(option.value)"
                class="interactive-row flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
              >
                <span class="truncate text-[var(--color-text-body)]">{{ option.label }}</span>
                <svg
                  v-if="newTaskMilestoneId === option.value"
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
      </div>

      <div class="flex-1 overflow-y-auto p-3 sm:p-4">
        <div class="space-y-4">
          <section v-if="groupedTasks.unassigned.length > 0" class="space-y-2">
            <h3 class="px-1 text-xs font-semibold tracking-wide text-[var(--color-text-secondary)]">默认列表</h3>
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
                    task.status === 2
                      ? 'border-[var(--color-success)] bg-[var(--color-success)]'
                      : 'border-[var(--color-input-border)] group-hover:border-[var(--color-border-strong)]'
                  "
                  @click.stop="toggleTaskStatus(task)"
                >
                  <svg
                    v-if="task.status === 2"
                    class="h-3 w-3 text-white"
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
                    task.status === 2
                      ? 'text-[var(--color-text-tertiary)] line-through'
                      : 'text-[var(--color-text-primary)]'
                  "
                >
                  {{ task.title }}
                </span>

                <div class="flex shrink-0 items-center gap-2">
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
                <span class="text-[var(--color-text-secondary)]">🚩</span>
                <input
                  v-model="editMilestoneName"
                  @keyup.enter="saveMilestone(group.milestone)"
                  @blur="saveMilestone(group.milestone)"
                  v-focus
                  type="text"
                  class="w-full rounded border border-[var(--color-input-border-focus)] px-2 py-1 text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-input-ring)]"
                />
              </div>

              <h3 v-else class="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
                <span class="text-[var(--color-text-secondary)]">🚩</span>
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
                    task.status === 2
                      ? 'border-[var(--color-success)] bg-[var(--color-success)]'
                      : 'border-[var(--color-input-border)] group-hover:border-[var(--color-border-strong)]'
                  "
                  @click.stop="toggleTaskStatus(task)"
                >
                  <svg
                    v-if="task.status === 2"
                    class="h-3 w-3 text-white"
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
                    task.status === 2
                      ? 'text-[var(--color-text-tertiary)] line-through'
                      : 'text-[var(--color-text-primary)]'
                  "
                >
                  {{ task.title }}
                </span>

                <div class="flex shrink-0 items-center gap-2">
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

          <div class="pt-1">
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
      </div>
    </main>

    <div
      v-if="!isMobile"
      class="-ml-1 z-20 w-1 cursor-col-resize bg-transparent transition-all hover:w-1.5 hover:bg-[var(--color-primary-soft-2)]"
      @mousedown="startResizeRight"
    ></div>

    <aside
      v-if="selectedTask || !isMobile"
      class="z-30 flex flex-col bg-[var(--color-bg-surface)]"
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
                class="surface-panel absolute left-0 top-full z-40 mt-2 w-full overflow-hidden rounded-lg py-1"
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
                class="surface-panel absolute left-0 top-full z-40 mt-2 w-[280px] max-w-full rounded-lg p-3"
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
                class="surface-panel absolute left-0 top-full z-40 mt-2 max-h-56 w-full overflow-y-auto rounded-lg py-1"
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
            class="min-h-[140px] w-full resize-none overflow-hidden rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-body)] outline-none transition-all focus:border-[var(--color-input-border-focus)] focus:ring-2 focus:ring-[var(--color-input-ring)]"
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
      icon="🗑️"
      :title="deleteTaskConfirmTitle"
      message="删除后可在 5 秒内撤销。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDeleteTask"
    />

    <AppConfirmDialog
      v-model="showDeleteMilestoneConfirm"
      variant="danger"
      icon="🗑️"
      :title="deleteMilestoneConfirmTitle"
      message="该阶段下的任务不会被删除，但会变回未分配状态。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDeleteMilestone"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
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
}

interface PriorityOption {
  value: number
  text: string
  dotClass: string
  textClass: string
}

interface CalendarCell {
  key: string
  iso: string
  day: number
  inCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const undoDelete = useUndoDelete()

const projectList = ref<Project[]>([])
const taskList = ref<Task[]>([])
const selectedTask = ref<Task | null>(null)
const milestoneList = ref<Milestone[]>([])
const selectedProjectId = ref('')

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
const showDeleteTaskConfirm = ref(false)
const showDeleteMilestoneConfirm = ref(false)
const pendingDeleteTask = ref<Task | null>(null)
const pendingDeleteMilestone = ref<{ id: string; name: string } | null>(null)
const priorityRowRef = ref<HTMLElement | null>(null)
const dueDateRowRef = ref<HTMLElement | null>(null)
const milestoneRowRef = ref<HTMLElement | null>(null)
const newTaskMilestoneMenuRef = ref<HTMLElement | null>(null)
const detailTitleInputRef = ref<HTMLTextAreaElement | null>(null)
const detailDescriptionInputRef = ref<HTMLTextAreaElement | null>(null)
const detailWidth = ref(Number(localStorage.getItem('tick_detailWidth')) || 340)
const isResizingRight = ref(false)
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)

const isMobile = computed(() => viewportWidth.value < 768)

const priorityOptions: PriorityOption[] = [
  { value: 3, text: '高', dotClass: 'priority-dot--urgent', textClass: 'priority-text--urgent' },
  { value: 2, text: '中', dotClass: 'priority-dot--high', textClass: 'priority-text--high' },
  { value: 1, text: '低', dotClass: 'priority-dot--low', textClass: 'priority-text--low' },
  { value: 0, text: '无', dotClass: 'priority-dot--medium', textClass: 'priority-text--medium' },
]

const getPriorityOption = (priority: number) =>
  priorityOptions.find((option) => option.value === priority) || priorityOptions[priorityOptions.length - 1]!

const taskItemPriorityBorderColorMap: Record<number, string> = {
  3: 'var(--color-danger)',
  2: 'var(--color-warning)',
  1: 'var(--color-success)',
  0: 'var(--color-text-primary)',
}

const getTaskItemBorderColor = (priority: number) =>
  taskItemPriorityBorderColorMap[priority] || taskItemPriorityBorderColorMap[0]

const TASK_TITLE_MAX_LENGTH = 50
const TASK_DESCRIPTION_MAX_LENGTH = 500

const getTaskDueDateTimestamp = (dueDate?: string | null) => {
  if (!dueDate) return Number.POSITIVE_INFINITY
  const timestamp = new Date(dueDate).getTime()
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

const compareTaskByDueDateThenPriority = (a: Task, b: Task) => {
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

const syncSelectedProject = () => {
  const queryId = route.query.projectId
  if (typeof queryId === 'string' && queryId) {
    selectedProjectId.value = queryId
    localStorage.setItem('tick_selectedProjectId', queryId)
    return
  }

  selectedProjectId.value = localStorage.getItem('tick_selectedProjectId') || ''
}

const loadProjects = async () => {
  try {
    const res = await fetchProjectList()
    const records = (res as unknown as { records?: Project[] })?.records
    projectList.value = records || []

    if (!selectedProjectId.value && projectList.value.length > 0) {
      const firstProject = projectList.value[0]
      if (!firstProject) return
      const firstId = firstProject.id
      selectedProjectId.value = firstId
      localStorage.setItem('tick_selectedProjectId', firstId)
      await router.replace({ path: '/tasks', query: { projectId: firstId } })
    }
  } catch (error) {
    console.error('加载项目失败', error)
  }
}

const loadTasks = async () => {
  if (!selectedProjectId.value) {
    taskList.value = []
    selectedTask.value = null
    return
  }

  try {
    const res = await fetchTaskList({
      projectId: selectedProjectId.value,
      current: 1,
      size: 100,
    })
    const records = (res as unknown as { records?: Task[] })?.records
    taskList.value = records || []

    if (selectedTask.value) {
      selectedTask.value = taskList.value.find((task) => task.id === selectedTask.value?.id) || null
    }
  } catch (error) {
    console.error('加载任务失败', error)
  }
}

const loadMilestones = async () => {
  if (!selectedProjectId.value) {
    milestoneList.value = []
    return
  }

  try {
    const res = await fetchMilestoneList({ projectId: selectedProjectId.value })
    const milestones = Array.isArray(res) ? (res as Milestone[]) : []
    milestoneList.value = milestones.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
  } catch (error) {
    console.error('加载里程碑失败', error)
  }
}

const addTask = async () => {
  if (!newTaskTitle.value.trim() || !selectedProjectId.value) return

  try {
    const finalTitle = newTaskTitle.value.trim().slice(0, TASK_TITLE_MAX_LENGTH)
    await addTaskApi({
      title: finalTitle,
      projectId: selectedProjectId.value,
      priority: 0,
      milestoneId: newTaskMilestoneId.value || undefined,
    })
    newTaskTitle.value = ''
    newTaskMilestoneId.value = ''
    isNewTaskMilestoneMenuOpen.value = false
    await loadTasks()
  } catch {
    toast.error('添加任务失败，请检查网络后重试。')
  }
}

const toggleTaskStatus = async (task: Task) => {
  const oldStatus = task.status
  const newStatus = oldStatus === 2 ? 0 : 2

  try {
    task.status = newStatus
    await updateTaskApi({ ...task, status: newStatus })
  } catch {
    task.status = oldStatus
    toast.error('更新状态失败，请检查网络后重试。')
  }
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

  return `🚩 ${milestone.name}`
})

const milestoneOptions = computed(() => [
  { value: null, label: '默认列表（未分配）' },
  ...milestoneList.value.map((milestone) => ({
    value: String(milestone.id),
    label: `🚩 ${milestone.name}`,
  })),
])

const selectedMilestoneValue = computed(() => {
  const milestoneId = selectedTask.value?.milestoneId
  if (!milestoneId || String(milestoneId) === '0') return null
  return String(milestoneId)
})

const newTaskMilestoneOptions = computed(() => [
  { value: '', label: '默认列表' },
  ...milestoneList.value.map((milestone) => ({
    value: String(milestone.id),
    label: `阶段：${milestone.name}`,
  })),
])

const newTaskMilestoneLabel = computed(() => {
  const option = newTaskMilestoneOptions.value.find((item) => item.value === newTaskMilestoneId.value)
  return option?.label || '默认列表'
})

const deleteTaskConfirmTitle = computed(() => {
  if (!pendingDeleteTask.value) return '确认删除任务？'
  return `确认删除任务“${pendingDeleteTask.value.title}”？`
})

const deleteMilestoneConfirmTitle = computed(() => {
  if (!pendingDeleteMilestone.value) return '确认删除阶段？'
  return `确认删除阶段“${pendingDeleteMilestone.value.name}”？`
})

const toggleNewTaskMilestoneMenu = () => {
  isPriorityMenuOpen.value = false
  closeDueDatePicker()
  isMilestoneMenuOpen.value = false
  isNewTaskMilestoneMenuOpen.value = !isNewTaskMilestoneMenuOpen.value
}

const selectNewTaskMilestone = (milestoneId: string) => {
  newTaskMilestoneId.value = milestoneId
  isNewTaskMilestoneMenuOpen.value = false
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

  if (
    isNewTaskMilestoneMenuOpen.value &&
    newTaskMilestoneMenuRef.value &&
    !newTaskMilestoneMenuRef.value.contains(targetNode)
  ) {
    isNewTaskMilestoneMenuOpen.value = false
  }
}

const selectPriority = async (val: number) => {
  if (!selectedTask.value) return

  const oldPriority = selectedTask.value.priority
  selectedTask.value.priority = val
  isPriorityMenuOpen.value = false

  try {
    await updateTaskApi({ ...selectedTask.value, priority: val })
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
    await loadTasks()
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
    await loadTasks()
  } catch {
    selectedTask.value.milestoneId = oldMilestoneId
    toast.error('更新所属阶段失败，请检查网络后重试。')
  }
}

const onTextBlur = async () => {
  if (!selectedTask.value) return

  try {
    await updateTaskApi({ ...selectedTask.value })
    await loadTasks()
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
  selectedTask.value = null

  undoDelete.scheduleUndoDelete({
    label: `任务「${taskToDelete.title}」`,
    pendingMessage: `任务「${taskToDelete.title}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteTaskApi(taskToDelete.id)
    },
    onCommitSuccess: async () => {
      await loadTasks()
    },
    onRollback: async () => {
      if (!taskList.value.some((task) => task.id === taskToDelete.id)) {
        const nextTasks = [...taskList.value]
        const insertIndex =
          originalIndex >= 0 && originalIndex <= nextTasks.length ? originalIndex : nextTasks.length
        nextTasks.splice(insertIndex, 0, taskToDelete)
        taskList.value = nextTasks
      }
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
    await loadMilestones()
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
    await loadMilestones()
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
      await Promise.all([loadMilestones(), loadTasks()])
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
  const completedCount = taskList.value.filter((t) => t.status === 2).length
  return Math.round((completedCount / taskList.value.length) * 100)
})

const groupedTasks = computed(() => {
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
      const completedCount = g.tasks.filter((t) => t.status === 2).length
      g.progress = Math.round((completedCount / g.tasks.length) * 100)
    }
  })

  return result
})

watch(
  () => route.query.projectId,
  async () => {
    syncSelectedProject()
    closeDueDatePicker()
    selectedTask.value = null
    isPriorityMenuOpen.value = false
    isMilestoneMenuOpen.value = false
    isNewTaskMilestoneMenuOpen.value = false
    await Promise.all([loadProjects(), loadMilestones(), loadTasks()])
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
  syncSelectedProject()
  await Promise.all([loadProjects(), loadMilestones(), loadTasks()])
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  stopResizeRight()
  window.removeEventListener('resize', updateViewport)
})
</script>
