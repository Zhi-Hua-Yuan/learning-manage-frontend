<template>
  <div class="relative flex min-h-full flex-1 bg-[var(--color-bg-page)]">
    <main class="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-bg-page)]">
      <div
        class="flex h-14 items-center justify-between gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-0 sm:px-5"
      >
        <div
          class="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl"
        >
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

        <button
          v-if="shouldShowUnifiedAiButton && isTodayView"
          type="button"
          class="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          :disabled="isUnifiedAiActionBusy"
          :class="isUnifiedAiActionBusy ? 'cursor-not-allowed opacity-70' : ''"
          :title="unifiedAiButtonHint"
          :aria-label="unifiedAiButtonHint"
          @click="handleUnifiedAiAction"
        >
          <svg
            v-if="isUnifiedAiActionBusy"
            class="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              stroke-width="2"
              class="opacity-25"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <AppIcon v-else name="sparkles" class="h-5 w-5" />
        </button>

        <div
          v-if="
            shouldRenderBoardData && !isAggregateView && selectedProjectId && taskList.length > 0
          "
          class="ml-auto flex items-center gap-2"
        >
          <button
            v-if="shouldShowUnifiedAiButton && !isAggregateView"
            type="button"
            class="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            :disabled="isUnifiedAiActionBusy"
            :class="isUnifiedAiActionBusy ? 'cursor-not-allowed opacity-70' : ''"
            :title="unifiedAiButtonHint"
            :aria-label="unifiedAiButtonHint"
            @click="handleUnifiedAiAction"
          >
            <svg
              v-if="isUnifiedAiActionBusy"
              class="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="2"
                class="opacity-25"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <AppIcon v-else name="sparkles" class="h-5 w-5" />
          </button>
          <div class="flex w-40 items-center gap-3 sm:w-56">
            <span class="mono text-xs text-[var(--color-text-secondary)]"
              >完成度 {{ projectProgress }}%</span
            >
            <div
              class="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-surface-secondary)]"
            >
              <div
                class="h-full bg-[var(--color-success)] transition-all duration-500"
                :style="{ width: projectProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="!isAggregateView"
        class="relative z-[var(--z-content-sticky)] border-b border-[var(--color-border-default)] px-4 py-3 sm:px-5"
      >
        <div
          v-if="canCreateTaskInCurrentContext"
          ref="newTaskQuickCreateRef"
          class="card-base flex flex-col gap-2 bg-[var(--color-bg-surface)] p-3 sm:flex-row sm:items-center"
          @focusin="onNewTaskQuickCreateFocusIn"
          @focusout="onNewTaskQuickCreateFocusOut"
        >
          <div class="flex min-w-0 flex-1 items-center">
            <span class="mr-2 text-lg font-bold text-[var(--color-text-tertiary)]">+</span>
            <input
              ref="newTaskTitleInputRef"
              v-model="newTaskTitle"
              @keydown.enter.exact="onNewTaskInputEnter"
              @keydown.tab.exact="onNewTaskInputTab"
              @focus="onNewTaskInputFocus"
              type="text"
              maxlength="50"
              :disabled="isAddingTask"
              placeholder="输入任务标题（最多 50 字），按回车保存，Tab 选择所属阶段"
              class="w-full min-w-0 bg-transparent text-sm text-[var(--color-text-body)] outline-none placeholder:text-[var(--color-text-tertiary)] disabled:cursor-wait disabled:opacity-60"
            />
            <button
              v-if="isInputFocused || isNewTaskFlagMenuOpen"
              ref="newTaskFlagTriggerRef"
              type="button"
              class="ml-1 inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-xs text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-surface-secondary)]"
              aria-label="选择阶段"
              aria-haspopup="listbox"
              :aria-controls="newTaskFlagMenuId"
              :aria-expanded="isNewTaskFlagMenuOpen ? 'true' : 'false'"
              :disabled="isAddingTask"
              @mousedown.prevent="toggleNewTaskFlagMenu"
              @focus="onNewTaskFlagTriggerFocus"
              @keydown="onNewTaskFlagTriggerKeydown"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                ></path>
              </svg>
              <span class="max-w-24 truncate">{{ newTaskMilestoneLabel }}</span>
            </button>
          </div>

          <div
            v-if="!isTeamProjectContext"
            class="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--color-bg-surface-secondary)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)]"
            data-testid="new-task-personal-assignee"
          >
            <span>负责人</span>
            <span class="max-w-28 truncate font-medium text-[var(--color-text-body)]">
              {{ newTaskPersonalAssigneeLabel }}
            </span>
          </div>

          <TaskAssigneePicker
            v-else
            :key="currentContextKey"
            ref="newTaskAssigneePickerRef"
            v-model="newTaskAssigneeUserId"
            class="w-full shrink-0 sm:w-48"
            :options="newTaskAssigneeOptions"
            :loading="newTaskAssigneeLoading"
            :error-message="newTaskAssigneeErrorMessage"
            :disabled="isAddingTask"
            trigger-label="选择任务负责人"
            @open="onNewTaskAssigneePickerOpen"
            @close="onNewTaskAssigneePickerClose"
            @retry="onNewTaskAssigneePickerRetry"
          />

          <!-- Flag Menu Popup - shows milestone/stage options -->
          <div
            v-if="isNewTaskFlagMenuOpen"
            :id="newTaskFlagMenuId"
            ref="newTaskFlagMenuRef"
            role="listbox"
            tabindex="-1"
            @click.stop
            @keydown="onNewTaskFlagMenuKeydown"
            @pointerdown.stop
            class="surface-panel absolute right-0 top-full z-[var(--z-dropdown)] mt-2 w-48 overflow-hidden rounded-lg py-1"
          >
            <button
              v-for="(option, optionIndex) in milestoneOptions"
              :key="option.value ?? 'default'"
              :id="getNewTaskFlagOptionId(optionIndex)"
              role="option"
              :aria-selected="isNewTaskMilestoneSelected(option.value) ? 'true' : 'false'"
              @click="selectNewTaskMilestone(option.value)"
              @mousemove="setNewTaskActiveMilestoneIndex(optionIndex)"
              class="interactive-row flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
              :class="
                optionIndex === newTaskActiveMilestoneIndex ? 'bg-[var(--color-menu-hover)]' : ''
              "
            >
              <span class="truncate text-[var(--color-text-body)]">{{ option.label }}</span>
              <svg
                v-if="isNewTaskMilestoneSelected(option.value)"
                class="ml-auto h-4 w-4 text-[var(--color-text-secondary)]"
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
            </button>
          </div>
        </div>

        <div
          v-else
          class="card-base bg-[var(--color-bg-surface)] px-3 py-3 text-sm text-[var(--color-text-secondary)]"
          data-testid="new-task-create-denied"
          role="status"
        >
          {{ taskCreateDeniedMessage }}
        </div>
      </div>

      <Transition name="content-fade" mode="out-in">
        <div :key="boardTransitionKey" class="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <div v-if="shouldRenderBoardData" class="space-y-4">
            <section v-if="groupedTasks.unassigned.length > 0" class="space-y-2">
              <div class="flex items-center gap-3 px-1">
                <h3 class="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)]">
                  {{ mainTaskSectionTitle }}
                </h3>
              </div>
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
                  <button
                    type="button"
                    :data-testid="`task-status-toggle-${task.id}`"
                    :disabled="isTaskStatusActionDisabled(task)"
                    :aria-pressed="isTaskCompleted(task.status)"
                    :aria-label="
                      !isTaskStatusActionDisabled(task)
                        ? `切换任务“${task.title}”状态`
                        : resolveTaskStatusActionTitle(task)
                    "
                    :title="
                      resolveTaskStatusActionTitle(task)
                    "
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
                  </button>

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
                    <button
                      v-if="isTodayView && getTodayAiOrderMeta(task)"
                      type="button"
                      class="inline-flex items-center rounded-full border border-[var(--color-ai)]/40 bg-[var(--color-success-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--color-ai)] transition-colors hover:bg-[var(--color-success-soft)]/80"
                      @click.stop="openTodayAiReasonDialog(task)"
                    >
                      AI
                    </button>
                    <span
                      v-if="isAggregateView"
                      class="inline-flex max-w-36 cursor-pointer items-center gap-1 rounded-full bg-[var(--color-bg-surface-muted)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-body)]"
                      @click="navigateToProject(task.projectId)"
                    >
                      <AppIcon :name="getTaskProjectIcon(task)" class="h-3.5 w-3.5" />
                      <span class="truncate">{{ getTaskProjectName(task) }}</span>
                    </span>
                    <span
                      v-if="task.dueDate"
                      class="mono text-xs text-[var(--color-text-secondary)]"
                    >
                      {{ formatTaskDueDate(task.dueDate) }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-surface-muted)] px-2 py-1 text-xs font-medium"
                      :class="getPriorityOption(task.priority).textClass"
                    >
                      <span
                        class="priority-dot"
                        :class="getPriorityOption(task.priority).dotClass"
                      ></span>
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

                <h3
                  v-else
                  class="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]"
                >
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
                  <span class="mono text-xs text-[var(--color-text-secondary)]"
                    >{{ group.progress }}%</span
                  >
                  <div
                    class="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-surface-secondary)]"
                  >
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
                  <button
                    type="button"
                    :data-testid="`task-status-toggle-${task.id}`"
                    :disabled="isTaskStatusActionDisabled(task)"
                    :aria-pressed="isTaskCompleted(task.status)"
                    :aria-label="
                      !isTaskStatusActionDisabled(task)
                        ? `切换任务“${task.title}”状态`
                        : resolveTaskStatusActionTitle(task)
                    "
                    :title="
                      resolveTaskStatusActionTitle(task)
                    "
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
                  </button>

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
                    <span
                      v-if="task.dueDate"
                      class="mono text-xs text-[var(--color-text-secondary)]"
                    >
                      {{ formatTaskDueDate(task.dueDate) }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-surface-muted)] px-2 py-1 text-xs font-medium"
                      :class="getPriorityOption(task.priority).textClass"
                    >
                      <span
                        class="priority-dot"
                        :class="getPriorityOption(task.priority).dotClass"
                      ></span>
                      {{ getPriorityOption(task.priority).text }}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <div v-if="!isAggregateView" class="pt-1">
              <div
                v-if="isAddingMilestone"
                class="card-base border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] p-1"
              >
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
                  <div
                    class="h-5 w-5 animate-pulse rounded border border-[var(--color-input-border)]"
                  ></div>
                  <div
                    class="h-3 w-2/3 animate-pulse rounded bg-[var(--color-bg-surface-muted)]"
                  ></div>
                  <div
                    class="ml-auto h-3 w-12 animate-pulse rounded bg-[var(--color-bg-surface-muted)]"
                  ></div>
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
      class="z-[var(--z-popover)] flex min-h-0 flex-col bg-[var(--color-bg-surface)]"
      :class="
        isMobile
          ? 'fixed inset-0 w-full border-l-0'
          : 'border-l border-[var(--color-border-default)] shadow-[var(--shadow-card)]'
      "
      :style="isMobile ? undefined : { width: detailWidth + 'px' }"
    >
      <template v-if="selectedTask">
        <div
          class="flex items-center justify-between border-b border-[var(--color-divider-muted)] p-4 text-[var(--color-text-body)]"
        >
          <div class="flex items-center gap-2">
            <button
              v-if="isMobile"
              @click="closeDetail"
              class="rounded-md p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
              title="返回列表"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span class="text-sm font-semibold">任务详情</span>
          </div>

          <div class="flex items-center gap-1">
            <button
              :data-testid="'task-delete-button'"
              :disabled="!selectedDeleteUi.allowed"
              :aria-label="
                selectedDeleteUi.allowed ? '删除任务' : selectedDeleteUi.deniedMessage || '删除任务'
              "
              :title="
                selectedDeleteUi.allowed ? '删除任务' : selectedDeleteUi.deniedMessage || '删除任务'
              "
              @click="requestDeleteTask"
              class="rounded p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-secondary)]"
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
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 min-h-0 space-y-4 overflow-y-auto p-4">
          <div
            v-if="
              !selectedEditContentUi.allowed ||
              !selectedReorganizeUi.allowed ||
              !selectedDeleteUi.allowed
            "
            class="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface-muted)] px-3 py-2 text-xs text-[var(--color-text-secondary)]"
            role="status"
          >
            <span v-if="selectedTaskIsReadOnly">此任务当前为只读状态。 </span>
            <span v-if="!selectedEditContentUi.allowed" id="task-edit-content-permission-hint">
              {{ selectedEditContentUi.deniedMessage }}
            </span>
            <span
              v-if="!selectedEditContentUi.allowed && !selectedReorganizeUi.allowed"
              aria-hidden="true"
              >；</span
            >
            <span v-if="!selectedReorganizeUi.allowed" id="task-reorganize-permission-hint">
              {{ selectedReorganizeUi.deniedMessage }}
            </span>
            <span
              v-if="
                (!selectedEditContentUi.allowed || !selectedReorganizeUi.allowed) &&
                !selectedDeleteUi.allowed
              "
              aria-hidden="true"
              >；</span
            >
            <span v-if="!selectedDeleteUi.allowed">
              {{ selectedDeleteUi.deniedMessage }}
            </span>
          </div>

          <TaskStatusRecoveryNotice
            v-if="selectedTaskStatusMutation"
            :phase="selectedTaskStatusMutation.phase"
            :message="selectedTaskStatusMutation.errorMessage"
            @retry="retrySelectedTaskStatusRequest"
            @refresh="refreshSelectedTaskStatusFacts"
          />

          <div class="space-y-1">
            <textarea
              ref="detailTitleInputRef"
              :value="selectedTask.title"
              :data-testid="'task-title-input'"
              :disabled="!selectedEditContentUi.allowed"
              :title="selectedEditContentUi.deniedMessage || undefined"
              :aria-describedby="
                selectedEditContentUi.allowed ? undefined : 'task-edit-content-permission-hint'
              "
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
            <svg
              class="h-5 w-5 text-[var(--color-text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-1 6-1 1H11.5l-1-1H5v12"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-[var(--color-text-secondary)]"
              >优先级</label
            >
            <div class="relative min-w-0 flex-1">
              <button
                type="button"
                :data-testid="'task-priority-trigger'"
                :disabled="!selectedReorganizeUi.allowed"
                :title="selectedReorganizeUi.deniedMessage || '设置优先级'"
                :aria-describedby="
                  selectedReorganizeUi.allowed ? undefined : 'task-reorganize-permission-hint'
                "
                @click.stop="togglePriorityMenu"
                class="task-detail-select-trigger"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="priority-dot" :class="currentPriorityObj.dotClass"></span>
                  <span class="truncate text-sm font-medium" :class="currentPriorityObj.textClass">
                    {{ currentPriorityObj.text }}
                  </span>
                </span>
                <svg
                  class="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>

              <div
                v-if="isPriorityMenuOpen && selectedReorganizeUi.allowed"
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
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div
            ref="dueDateRowRef"
            class="flex items-center gap-3 border-b border-[var(--color-divider-muted)] py-3"
          >
            <svg
              class="h-5 w-5 text-[var(--color-text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-[var(--color-text-secondary)]"
              >截止日期</label
            >

            <div class="relative min-w-0 flex-1">
              <button
                type="button"
                :data-testid="'task-due-date-trigger'"
                :disabled="!selectedEditContentUi.allowed"
                :title="selectedEditContentUi.deniedMessage || '设置截止日期'"
                :aria-describedby="
                  selectedEditContentUi.allowed ? undefined : 'task-edit-content-permission-hint'
                "
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
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>

              <div
                v-if="isDueDatePickerOpen && selectedEditContentUi.allowed"
                @click.stop
                class="surface-panel absolute left-0 top-full z-[var(--z-dropdown)] mt-2 flex w-full max-w-[320px] aspect-[5/6] flex-col overflow-hidden rounded-lg p-2"
              >
                <div class="mb-2 flex shrink-0 items-center justify-between">
                  <button
                    type="button"
                    @click="shiftCalendarMonth(-1)"
                    class="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
                    aria-label="上个月"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 19l-7-7 7-7"
                      ></path>
                    </svg>
                  </button>
                  <span class="mono text-xs font-medium text-[var(--color-text-primary)]">
                    {{ currentCalendarMonthLabel }}
                  </span>
                  <button
                    type="button"
                    @click="shiftCalendarMonth(1)"
                    class="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
                    aria-label="下个月"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      ></path>
                    </svg>
                  </button>
                </div>

                <div
                  class="mb-1 grid shrink-0 grid-cols-7 gap-1 text-center text-[11px] text-[var(--color-text-tertiary)]"
                >
                  <span v-for="weekday in calendarWeekdayLabels" :key="weekday" class="py-1">{{
                    weekday
                  }}</span>
                </div>

                <div class="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr gap-1">
                  <button
                    v-for="cell in calendarCells"
                    :key="cell.key"
                    type="button"
                    @click="selectDueDate(cell.iso)"
                    class="h-full min-h-0 rounded-md text-xs leading-none transition-colors"
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

                <div class="mt-2 flex shrink-0 items-center justify-between gap-2">
                  <button
                    type="button"
                    @click="clearDueDate"
                    class="inline-flex h-7 items-center rounded-md px-1.5 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    清空
                  </button>
                  <button
                    type="button"
                    @click="selectTodayDueDate"
                    class="inline-flex h-7 items-center rounded-md px-1.5 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
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
            <svg
              class="h-5 w-5 text-[var(--color-text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
            <label class="w-20 text-sm font-medium text-[var(--color-text-secondary)]"
              >所属阶段</label
            >

            <div class="relative min-w-0 flex-1">
              <button
                type="button"
                :data-testid="'task-milestone-trigger'"
                :disabled="!selectedReorganizeUi.allowed"
                :title="selectedReorganizeUi.deniedMessage || '设置所属阶段'"
                :aria-describedby="
                  selectedReorganizeUi.allowed ? undefined : 'task-reorganize-permission-hint'
                "
                @click.stop="toggleMilestoneMenu"
                class="task-detail-select-trigger"
              >
                <span class="truncate text-sm text-[var(--color-text-body)]">{{
                  currentMilestoneLabel
                }}</span>
                <svg
                  class="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>

              <div
                v-if="isMilestoneMenuOpen && selectedReorganizeUi.allowed"
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
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <TaskAssigneeEntry
            ref="taskAssigneeEntryRef"
            :presentation="selectedAssigneePresentation"
            :assign-allowed="selectedAssignUi.allowed"
            :assign-denied-message="selectedAssignUi.deniedMessage"
            @request-change="openTaskAssignmentDialog"
            @request-history="openTaskAssignmentHistoryDrawer"
          />

          <textarea
            ref="detailDescriptionInputRef"
            :data-testid="'task-description-input'"
            :disabled="!selectedEditContentUi.allowed"
            :title="selectedEditContentUi.deniedMessage || undefined"
            :aria-describedby="
              selectedEditContentUi.allowed ? undefined : 'task-edit-content-permission-hint'
            "
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
        <div
          class="flex h-full flex-col items-center justify-center px-4 text-[var(--color-text-tertiary)]"
        >
          <svg
            class="mb-4 h-16 w-16 text-[var(--color-text-tertiary)] opacity-60"
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
          <p class="text-sm">请选择任务查看详情</p>
        </div>
      </template>
    </aside>

    <transition name="completion-overlay">
      <div
        v-if="showTodayAiReasonDialog && selectedTodayAiReason"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="AI 排序依据"
      >
        <div class="completion-backdrop absolute inset-0" @click="closeTodayAiReasonDialog">
          <div class="completion-backdrop-base absolute inset-0"></div>
          <div class="completion-backdrop-blur absolute inset-0"></div>
        </div>

        <div
          class="completion-panel surface-panel relative z-[var(--z-modal-panel)] w-full max-w-sm overflow-hidden rounded-2xl"
          @click.stop
        >
          <div class="ai-reason-header h-1.5 w-full"></div>
          <div class="space-y-4 p-6">
            <div class="text-center">
              <div
                class="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-ai)]"
              >
                <AppIcon name="sparkles" class="h-6 w-6" />
              </div>
              <h3 class="text-lg font-bold text-[var(--color-text-primary)]">AI 智能排序依据</h3>
              <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
                {{ selectedTodayAiReason.taskTitle }}
              </p>
            </div>
            <div
              class="rounded-lg bg-[var(--color-bg-surface-muted)] px-3 py-2 text-sm text-[var(--color-text-body)]"
            >
              排序位次：<span class="mono font-semibold text-[var(--color-ai)]"
                >#{{ selectedTodayAiReason.rank }}</span
              >
            </div>
            <div
              class="rounded-lg border border-[var(--color-input-border)] bg-[var(--color-bg-surface)] px-3 py-3 text-sm leading-relaxed text-[var(--color-text-body)]"
            >
              {{ selectedTodayAiReason.reason || 'AI 未返回详细理由。' }}
            </div>
          </div>
          <div class="flex justify-end p-4 pt-0">
            <button
              type="button"
              class="btn-ai rounded-xl px-5 py-2 text-sm font-bold"
              @click="closeTodayAiReasonDialog"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="completion-overlay">
      <div
        v-if="showListReplanPreviewModal && listReplanPreviewPayload"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="AI 清单重排预览"
      >
        <div class="completion-backdrop absolute inset-0" @click="closeListReplanPreviewDialog">
          <div class="completion-backdrop-base absolute inset-0"></div>
          <div class="completion-backdrop-blur absolute inset-0"></div>
        </div>

        <div
          class="completion-panel surface-panel relative z-[var(--z-modal-panel)] w-full max-w-3xl overflow-hidden rounded-2xl"
          @click.stop
        >
          <div class="ai-reason-header h-1.5 w-full"></div>
          <div class="space-y-4 p-6">
            <div class="text-center">
              <div
                class="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-ai)]"
              >
                <AppIcon name="sparkles" class="h-6 w-6" />
              </div>
              <h3 class="text-lg font-bold text-[var(--color-text-primary)]">AI 清单重排预览</h3>
              <p class="mt-1 text-xs text-[var(--color-text-secondary)]">清单：{{ pageTitle }}</p>
            </div>
            <div
              class="rounded-lg bg-[var(--color-bg-surface-muted)] px-3 py-2 text-sm text-[var(--color-text-body)]"
            >
              变更任务数：<span class="mono font-semibold text-[var(--color-ai)]">{{
                listReplanChangedCount
              }}</span>
            </div>
            <div
              v-if="listReplanPreviewItems.length === 0"
              class="rounded-lg border border-[var(--color-input-border)] bg-[var(--color-bg-surface)] px-3 py-4 text-center text-sm text-[var(--color-text-secondary)]"
            >
              当前预览未检测到可应用的任务变更。
            </div>
            <div v-else class="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              <div
                v-for="item in listReplanPreviewItems"
                :key="String(item.taskId)"
                class="rounded-lg border border-[var(--color-input-border)] bg-[var(--color-bg-surface)] p-3"
              >
                <div class="text-sm font-semibold text-[var(--color-text-primary)]">
                  {{ item.newTitle || item.oldTitle || `任务 #${item.taskId}` }}
                </div>
                <div class="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                  <div class="list-replan-field-row">
                    <span class="list-replan-field-label">标题</span>
                    <div class="list-replan-field-change">
                      <span class="list-replan-chip">{{ item.oldTitle || '（空）' }}</span>
                      <svg
                        class="list-replan-arrow h-3.5 w-3.5"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 10h12m-4-4 4 4-4 4"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <span class="list-replan-chip">{{ item.newTitle || '（空）' }}</span>
                    </div>
                  </div>
                  <div class="list-replan-field-row">
                    <span class="list-replan-field-label">优先级</span>
                    <div class="list-replan-field-change">
                      <span
                        class="list-replan-priority-chip"
                        :class="[
                          getPriorityOption(item.oldPriority ?? 0).textClass,
                          getListReplanPriorityChipClass(item.oldPriority ?? 0),
                        ]"
                      >
                        <span
                          class="priority-dot"
                          :class="getPriorityOption(item.oldPriority ?? 0).dotClass"
                        ></span>
                        {{ getPriorityOption(item.oldPriority ?? 0).text }}
                      </span>
                      <svg
                        class="list-replan-arrow h-3.5 w-3.5"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 10h12m-4-4 4 4-4 4"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <span
                        class="list-replan-priority-chip"
                        :class="[
                          getPriorityOption(item.newPriority ?? 0).textClass,
                          getListReplanPriorityChipClass(item.newPriority ?? 0),
                        ]"
                      >
                        <span
                          class="priority-dot"
                          :class="getPriorityOption(item.newPriority ?? 0).dotClass"
                        ></span>
                        {{ getPriorityOption(item.newPriority ?? 0).text }}
                      </span>
                    </div>
                  </div>
                  <div class="list-replan-field-row">
                    <span class="list-replan-field-label">截止日期</span>
                    <div class="list-replan-field-change">
                      <span class="list-replan-chip">{{
                        formatTaskDueDate(item.oldDueDate) || '未设置'
                      }}</span>
                      <svg
                        class="list-replan-arrow h-3.5 w-3.5"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 10h12m-4-4 4 4-4 4"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <span class="list-replan-chip">{{
                        formatTaskDueDate(item.newDueDate) || '未设置'
                      }}</span>
                    </div>
                  </div>
                  <div class="list-replan-field-row">
                    <span class="list-replan-field-label">置信度</span>
                    <span class="mono text-[var(--color-text-body)]">
                      {{ normalizeListReplanConfidence(item.confidence) }}%
                    </span>
                  </div>
                </div>
                <div
                  class="mt-2 rounded-lg bg-[var(--color-bg-surface-muted)] px-2 py-1 text-xs text-[var(--color-text-body)]"
                >
                  {{ item.reason || 'AI 未返回调整原因。' }}
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 p-4 pt-0">
            <button
              type="button"
              class="btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
              :disabled="isListReplanActionBusy"
              :class="isListReplanActionBusy ? 'cursor-not-allowed opacity-70' : ''"
              @click="cancelListReplanPreview"
            >
              {{ isListReplanCancelling ? '取消中...' : '取消预览' }}
            </button>
            <button
              type="button"
              class="btn-ai rounded-xl px-5 py-2 text-sm font-bold"
              :disabled="isListReplanActionBusy || !canConfirmListReplan"
              :class="
                isListReplanActionBusy || !canConfirmListReplan
                  ? 'cursor-not-allowed opacity-70'
                  : ''
              "
              @click="confirmListReplanPreview"
            >
              {{ isListReplanConfirming ? '确认中...' : '确认生效' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <TaskAssignmentDialog
      :open="Boolean(taskAssignmentDraft)"
      :task-title="assignmentTask?.title || ''"
      :current-assignee="selectedAssigneePresentation"
      :target-assignee-user-id="taskAssignmentDraft?.targetAssigneeUserId ?? null"
      :options="taskAssignmentAssigneeOptions"
      :candidates-loading="taskAssignmentCandidatesLoading"
      :candidates-error-message="taskAssignmentCandidatesErrorMessage"
      :reason="taskAssignmentDraft?.reason || ''"
      :busy="taskAssignmentMutationBusy"
      :submission-blocked="taskAssignmentMutationBlocked"
      :submission-error-message="taskAssignmentMutationErrorMessage"
      :recovery-required="taskAssignmentMutationPhase === 'committed-refresh-error'"
      :recovery-mode="taskAssignmentRecoveryMode"
      :recovery-source="taskAssignmentRecoverySource"
      :initial-assignee-label="taskAssignmentInitialAssigneeLabel"
      @update:target-assignee-user-id="setTaskAssignmentTarget"
      @update:reason="setTaskAssignmentReason"
      @retry="retryTaskAssignmentCandidates"
      @recover="recoverTaskAssignment"
      @reconfirm="reconfirmTaskAssignment"
      @cancel="closeTaskAssignmentDialog"
      @confirm="submitTaskAssignment"
    />

    <TaskAssignmentHistoryDrawer
      ref="taskAssignmentHistoryDrawerRef"
      :open="isTaskAssignmentHistoryDrawerOpen"
      :task-title="selectedTask?.title || ''"
      :records="taskAssignmentHistoryRecords"
      :phase="taskAssignmentHistoryPhase"
      :error-message="taskAssignmentHistoryErrorMessage"
      :has-more="taskAssignmentHistoryHasMore"
      :total="taskAssignmentHistoryTotal"
      @close="closeTaskAssignmentHistoryDrawer"
      @retry="retryTaskAssignmentHistory"
      @load-more="loadMoreTaskAssignmentHistory"
    />

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
                :data-testid="`task-completion-quality-${option.status}`"
                class="completion-option focus-ring rounded-xl px-2 py-3 transition-all"
                :class="option.toneClass"
                :disabled="pendingCompletionTask ? isTaskStatusActionDisabled(pendingCompletionTask) : true"
                @click="confirmCompletionQuality(option.status)"
              >
                <span class="block text-3xl leading-none">{{ option.emoji }}</span>
                <span class="mt-2 block text-base font-semibold">
                  {{ option.label }}
                  <span class="mono ml-1 text-xs font-medium opacity-70">{{
                    option.shortcutKey
                  }}</span>
                </span>
              </button>
            </div>
            <p class="mt-3 text-xs text-[var(--color-text-tertiary)]">快捷键：差 1 · 中 2 · 好 3</p>
          </div>

          <div class="flex justify-end p-4 pt-0">
            <button
              type="button"
              class="btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
              @click="closeCompletionQualityModal"
            >
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
import {
  aiListReplanCancelApi,
  aiListReplanConfirmApi,
  aiListReplanPreviewApi,
  type AiListReplanPreviewItem,
  type AiListReplanPreviewResponse,
  aiTodayOrderRecommendApi,
  type AiTodayOrderItem,
  type AiTodayOrderRecommendRequest,
} from '@/api/ai'
import { fetchProjectList } from '@/api/project'
import {
  addTaskApi,
  deleteTaskApi,
  fetchTaskList,
  updateTaskContentApi,
} from '@/api/task'
import {
  addMilestoneApi,
  deleteMilestoneApi,
  fetchMilestoneList,
  updateMilestoneApi,
} from '@/api/milestone'
import { useToast } from '@/composables/useToast'
import { useAiPendingRequest } from '@/composables/useAiPendingRequest'
import {
  useTaskAssigneeCandidates,
  type TaskAssigneeCandidateContext,
} from '@/composables/useTaskAssigneeCandidates'
import { useTaskAssignmentDraft } from '@/composables/useTaskAssignmentDraft'
import {
  useTaskAssignmentMutation,
  type TaskAssignmentRecoverySource,
} from '@/composables/useTaskAssignmentMutation'
import { useUndoDelete } from '@/composables/useUndoDelete'
import { useSessionResetHandler } from '@/composables/useSessionResetHandler'
import { AI_PENDING_BOARDS, useAiPendingRegistryStore } from '@/stores/aiPendingRegistry'
import { useCollaborationStore } from '@/stores/collaboration'
import { useToastStore } from '@/stores/toast'
import TaskAssigneeEntry from '@/components/TaskAssigneeEntry.vue'
import TaskAssigneePicker from '@/components/TaskAssigneePicker.vue'
import TaskAssignmentDialog from '@/components/TaskAssignmentDialog.vue'
import TaskAssignmentHistoryDrawer from '@/components/TaskAssignmentHistoryDrawer.vue'
import TaskStatusRecoveryNotice from '@/components/TaskStatusRecoveryNotice.vue'
import { useTaskAssignmentHistory } from '@/composables/useTaskAssignmentHistory'
import {
  useTaskStatusMutation,
  type TaskStatusMutationOutcome,
  type TaskStatusMutationState,
} from '@/composables/useTaskStatusMutation'
import {
  buildPersonalProjectRoute,
  parseTaskProjectContext,
  resolvePersonalProjectFallback,
} from '@/router/taskProjectContext'
import { readProjectListCache, writeProjectListCache } from '@/utils/projectCache'
import {
  offProjectListUpdated,
  onProjectListUpdated,
  type ProjectListUpdatedDetail,
} from '@/utils/projectEvents'
import {
  readAllProjectsTaskCache,
  readTaskCache,
  removeProjectTaskCaches,
  removeTaskFromCaches,
  syncAggregateTaskCacheByProject,
  upsertTaskInCaches,
  writeAggregateTaskCacheFromRecords,
  writeTaskCache,
} from '@/utils/taskCache'
import {
  clearTaskListReplanStateCache,
  clearTaskTodayAiOrderCache,
  readSelectedProjectIdCache,
  readTaskListReplanStateCache,
  readTaskTodayAiOrderCache,
  writeSelectedProjectIdCache,
  writeTaskListReplanStateCache,
  writeTaskTodayAiOrderCache,
} from '@/utils/appCache'
import { getActiveCacheActor } from '@/utils/cacheActor'
import {
  captureAuthSessionSnapshot,
  isAuthSessionSnapshotActive,
  type AuthSessionSnapshot,
} from '@/utils/sessionLifecycle'
import {
  isTaskCompleted,
  TASK_STATUS_DONE_BASIC,
  TASK_STATUS_DONE_EXCELLENT,
  TASK_STATUS_DONE_STANDARD,
  TASK_STATUS_TODO,
} from '@/utils/taskStatus'
import { DENY_ALL_TASK_CAPABILITIES, type TaskAssignmentResult, type TaskModel } from '@/types/task'
import { findTaskById, normalizeTaskRecords } from '@/utils/taskCollection'
import {
  canPerformTaskAction,
  resolveTaskActionUiState,
  TASK_ACTION_DENIED_MESSAGE,
  type TaskAction,
} from '@/utils/taskCapabilities'
import { resolveTaskAssigneePresentation } from '@/utils/taskAssigneePresentation'
import { normalizeTaskAssignmentReason, type TaskAssignmentOperation } from '@/utils/taskAssignment'
import {
  buildTaskQuickCreatePayload,
  resolveTaskQuickCreateAccess,
  type TaskQuickCreateContext,
} from '@/utils/taskQuickCreate'
import { classifyApiError } from '@/utils/request'

interface TodayAiOrderMeta {
  rank: number
  reason: string
}

interface TodayAiOrderCachePayload {
  dateKey: string
  metaByTaskId: Record<string, TodayAiOrderMeta>
}

interface ListReplanPendingOperation {
  listId: string
  operationId: string
  createdAt: string
}

interface ListReplanStateEntry {
  dirty: boolean
  pendingOperation: ListReplanPendingOperation | null
  previewPayload: AiListReplanPreviewResponse | null
  updatedAt: number
}

type ListReplanStateMap = Record<string, ListReplanStateEntry>

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
  shortcutKey: '1' | '2' | '3'
}

interface CalendarCell {
  key: string
  iso: string
  day: number
  inCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
}

interface TaskContextSnapshot {
  session: AuthSessionSnapshot
  contextKey: string
  projectId: string
  teamId: string
}

interface TaskWriteSnapshot {
  context: TaskContextSnapshot
  actorId: string | null
  operationKey: string
  operationRevision: number
  taskId?: string
}

interface LoadOptions {
  forceRefresh?: boolean
  contextSnapshot?: TaskContextSnapshot
}

interface PendingTaskAssignmentRefresh {
  taskId: string
  projectId: string
  contextKey: string
  sessionSnapshot: AuthSessionSnapshot
  operation: TaskAssignmentOperation
  result: TaskAssignmentResult
  cacheInvalidated: boolean
  changedEventEmitted: boolean
}

type DisplayPhase = 'loading' | 'slow' | 'ready' | 'error'
type LoadOutcomeStatus = 'ok' | 'stale' | 'error'
type TaskAssignmentRecoveryMode = 'none' | 'reconciling' | 'reconfirm' | 'recovery-error'

interface LoadOutcome {
  status: LoadOutcomeStatus
  error?: unknown
}

interface ContextLoadOptions {
  forceProjectRefresh?: boolean
  forceMilestoneRefresh?: boolean
  forceTaskRefresh?: boolean
  contextSnapshot?: TaskContextSnapshot
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const extractListPayload = <T,>(payload: unknown): T[] | null => {
  if (Array.isArray(payload)) return payload as T[]
  if (!isRecord(payload)) return null

  if (Array.isArray(payload.records)) return payload.records as T[]
  if (!('data' in payload)) return null

  const nested = payload.data
  if (Array.isArray(nested)) return nested as T[]
  if (isRecord(nested) && Array.isArray(nested.records)) return nested.records as T[]
  return null
}

const extractTaskPagePayload = (payload: unknown): TaskPageResponse => {
  const fallback: TaskPageResponse = { records: [] }

  if (Array.isArray(payload)) {
    return { records: payload }
  }

  if (!isRecord(payload)) return fallback

  if (Array.isArray(payload.data)) {
    return { records: payload.data }
  }

  const source =
    isRecord(payload.data) && Array.isArray(payload.data.records) ? payload.data : payload
  const records = Array.isArray(source.records) ? source.records : []

  return {
    records,
    current: typeof source.current === 'number' ? source.current : undefined,
    size: typeof source.size === 'number' ? source.size : undefined,
    total: typeof source.total === 'number' ? source.total : undefined,
  }
}

const extractAiTodayOrderItems = (payload: unknown): AiTodayOrderItem[] => {
  if (!isRecord(payload)) return []
  if (Array.isArray(payload.items)) return payload.items as AiTodayOrderItem[]
  if (isRecord(payload.data) && Array.isArray(payload.data.items)) {
    return payload.data.items as AiTodayOrderItem[]
  }
  return []
}

const normalizeAiRank = (rawRank: unknown, fallbackRank: number) => {
  const rank = Number(rawRank)
  if (!Number.isFinite(rank) || rank < 1) return fallbackRank
  return Math.floor(rank)
}

const createTodayAiOrderMetaMap = (items: AiTodayOrderItem[]) => {
  const metaMap: Record<string, TodayAiOrderMeta> = {}
  items.forEach((item, index) => {
    const taskId = String(item.taskId ?? '').trim()
    if (!taskId) return
    const rank = normalizeAiRank(item.rank, index + 1)
    const reason = typeof item.reason === 'string' ? item.reason.trim() : ''
    const current = metaMap[taskId]
    if (!current || rank < current.rank) {
      metaMap[taskId] = { rank, reason }
    }
  })
  return metaMap
}

const resolveClientTimezone = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (typeof timezone === 'string' && timezone.trim()) return timezone
  } catch {
    // ignore and use fallback timezone
  }
  return AI_TODAY_ORDER_DEFAULT_TIMEZONE
}

const formatIsoLocalDateTimeSeconds = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const getTodayDateKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
}

const normalizeTodayAiOrderMetaMap = (raw: unknown): Record<string, TodayAiOrderMeta> => {
  if (!raw || typeof raw !== 'object') return {}
  const source = raw as Record<string, unknown>
  const normalized: Record<string, TodayAiOrderMeta> = {}

  Object.entries(source).forEach(([taskId, value]) => {
    if (!taskId) return
    if (!value || typeof value !== 'object') return

    const rank = Number((value as { rank?: unknown }).rank)
    if (!Number.isFinite(rank) || rank < 1) return

    const reasonRaw = (value as { reason?: unknown }).reason
    normalized[taskId] = {
      rank: Math.floor(rank),
      reason: typeof reasonRaw === 'string' ? reasonRaw.trim() : '',
    }
  })

  return normalized
}

const hydrateTodayAiOrderMetaFromCache = () => {
  const cached = readTaskTodayAiOrderCache<TodayAiOrderCachePayload>()
  if (!cached || cached.dateKey !== getTodayDateKey()) {
    clearTaskTodayAiOrderCache()
    return
  }
  todayAiOrderMetaByTaskId.value = normalizeTodayAiOrderMetaMap(cached.metaByTaskId)
}

const persistTodayAiOrderMetaToCache = (metaMap: Record<string, TodayAiOrderMeta>) => {
  writeTaskTodayAiOrderCache<TodayAiOrderCachePayload>({
    dateKey: getTodayDateKey(),
    metaByTaskId: metaMap,
  })
}

const LIST_REPLAN_OPERATION_TTL_MS = 30 * 60 * 1000

const normalizeListId = (value: unknown) => String(value ?? '').trim()

const normalizeListReplanPreviewItems = (value: unknown): AiListReplanPreviewItem[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const record = item as Record<string, unknown>
      return {
        taskId: String(record.taskId ?? '').trim(),
        oldTitle: typeof record.oldTitle === 'string' ? record.oldTitle.trim() : '',
        newTitle: typeof record.newTitle === 'string' ? record.newTitle.trim() : '',
        oldPriority: Number(record.oldPriority),
        newPriority: Number(record.newPriority),
        oldDueDate: typeof record.oldDueDate === 'string' ? record.oldDueDate.trim() : null,
        newDueDate: typeof record.newDueDate === 'string' ? record.newDueDate.trim() : null,
        confidence: Number(record.confidence),
        reason: typeof record.reason === 'string' ? record.reason.trim() : '',
      }
    })
    .filter((item) => item.taskId)
}

const normalizeListReplanPreviewPayload = (value: unknown): AiListReplanPreviewResponse | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const operationId = String(record.operationId ?? '').trim()
  if (!operationId) return null

  const changedCountRaw = Number(record.changedCount)
  const changedCount =
    Number.isFinite(changedCountRaw) && changedCountRaw >= 0 ? Math.floor(changedCountRaw) : 0

  return {
    operationId,
    changedCount,
    previewTasks: normalizeListReplanPreviewItems(record.previewTasks),
  }
}

const isListReplanOperationExpired = (operation: ListReplanPendingOperation | null) => {
  if (!operation) return false
  const createdAt = Date.parse(operation.createdAt)
  if (!Number.isFinite(createdAt)) return true
  return Date.now() - createdAt > LIST_REPLAN_OPERATION_TTL_MS
}

const normalizeListReplanPendingOperation = (
  value: unknown,
  listId: string,
): ListReplanPendingOperation | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const operationId = String(record.operationId ?? '').trim()
  const operationListId = normalizeListId(record.listId)
  const createdAt = String(record.createdAt ?? '').trim()
  if (!operationId || !operationListId || !createdAt) return null
  if (operationListId !== listId) return null
  const operation = { listId: operationListId, operationId, createdAt }
  return isListReplanOperationExpired(operation) ? null : operation
}

const normalizeListReplanStateMap = (value: unknown): ListReplanStateMap => {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  const next: ListReplanStateMap = {}

  Object.entries(source).forEach(([listIdRaw, entryRaw]) => {
    const listId = normalizeListId(listIdRaw)
    if (!listId || !entryRaw || typeof entryRaw !== 'object') return

    const entry = entryRaw as Record<string, unknown>
    const dirty = Boolean(entry.dirty)
    const pendingOperation = normalizeListReplanPendingOperation(entry.pendingOperation, listId)
    const previewPayload = pendingOperation
      ? normalizeListReplanPreviewPayload(entry.previewPayload)
      : null
    const updatedAt = Number(entry.updatedAt)

    next[listId] = {
      dirty,
      pendingOperation,
      previewPayload,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    }
  })

  return next
}

const readListReplanStateMap = (): ListReplanStateMap => {
  return normalizeListReplanStateMap(readTaskListReplanStateCache<unknown>())
}

const writeListReplanStateMap = (stateMap: ListReplanStateMap) => {
  const nextKeys = Object.keys(stateMap)
  if (nextKeys.length === 0) {
    clearTaskListReplanStateCache()
    return
  }
  writeTaskListReplanStateCache<ListReplanStateMap>(stateMap)
}

const PROJECT_LIST_EVENT_SOURCE = 'task-list'
const AGGREGATE_PAGE_SIZE = 100
const AGGREGATE_MAX_PAGES = 200
const AI_TODAY_ORDER_MAX_LIMIT = 50
const AI_TODAY_ORDER_DEFAULT_STRATEGY = 'balanced'
const AI_TODAY_ORDER_DEFAULT_TIMEZONE = 'Asia/Shanghai'
const BOARD_SLOW_THRESHOLD_MS = 1200
const PROJECT_CONTEXT_PREFIX = 'project:'
const AGGREGATE_CONTEXT_PREFIX = 'aggregate:'
const DEFAULT_BOARD_ERROR_MESSAGE = '加载失败，请稍后重试。'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const toastStore = useToastStore()
const aiPendingRegistry = useAiPendingRegistryStore()
const collaborationStore = useCollaborationStore()
const { runAiRequest } = useAiPendingRequest()
const undoDelete = useUndoDelete()

const projectList = ref<Project[]>([])
const taskList = ref<TaskModel[]>([])
const selectedTask = ref<TaskModel | null>(null)
const {
  draft: taskAssignmentDraft,
  operation: taskAssignmentOperation,
  open: openTaskAssignmentDraft,
  close: closeTaskAssignmentDraft,
  setTargetAssigneeUserId: setTaskAssignmentTarget,
  setReason: setTaskAssignmentReason,
  rebaseExpectedAssigneeUserId: rebaseTaskAssignmentExpectedAssignee,
  invalidateUnlessCurrent: invalidateTaskAssignmentDraft,
} = useTaskAssignmentDraft()
const {
  phase: taskAssignmentMutationPhase,
  errorMessage: taskAssignmentMutationErrorMessage,
  recoverySource: taskAssignmentRecoverySource,
  busy: taskAssignmentMutationBusy,
  blocked: taskAssignmentMutationBlocked,
  submit: submitTaskAssignmentMutation,
  complete: completeTaskAssignmentMutation,
  markCommittedRefreshError: markTaskAssignmentCommittedRefreshError,
  beginCommittedRefreshRetry: beginCommittedTaskAssignmentRefreshRetry,
  beginFailureRecovery: beginTaskAssignmentFailureRecovery,
  requireReconfirmation: requireTaskAssignmentReconfirmation,
  markRecoveryError: markTaskAssignmentRecoveryError,
  beginRecoveryRetry: beginTaskAssignmentRecoveryRetry,
  beginExplicitReconfirm: beginExplicitTaskAssignmentReconfirm,
  reset: resetTaskAssignmentMutation,
} = useTaskAssignmentMutation()
const {
  activeTaskId: taskAssignmentHistoryTaskId,
  records: taskAssignmentHistoryRecords,
  total: taskAssignmentHistoryTotal,
  phase: taskAssignmentHistoryPhase,
  busy: taskAssignmentHistoryBusy,
  errorMessage: taskAssignmentHistoryErrorMessage,
  hasMore: taskAssignmentHistoryHasMore,
  open: openTaskAssignmentHistory,
  refresh: refreshTaskAssignmentHistory,
  loadMore: loadMoreTaskAssignmentHistoryRecords,
  reset: resetTaskAssignmentHistory,
} = useTaskAssignmentHistory()
const {
  getState: getTaskStatusMutationState,
  isBlocked: isTaskStatusMutationBlocked,
  submitNew: submitNewTaskStatusMutation,
  retryUncertain: retryUncertainTaskStatusMutation,
  beginFactReconciliation: beginTaskStatusFactReconciliation,
  restoreUncertain: restoreUncertainTaskStatusMutation,
  markCommittedRefreshError: markTaskStatusCommittedRefreshError,
  markFactRefreshError: markTaskStatusFactRefreshError,
  beginFactRefreshRetry: beginTaskStatusFactRefreshRetry,
  claimChangedSideEffect: claimTaskStatusChangedSideEffect,
  complete: completeTaskStatusMutation,
  resetAll: resetAllTaskStatusMutations,
} = useTaskStatusMutation()
const isTaskAssignmentHistoryDrawerOpen = ref(false)
const taskAssignmentHistoryDrawerRef = ref<InstanceType<typeof TaskAssignmentHistoryDrawer> | null>(
  null,
)
const taskAssignmentChangedRevision = ref(0)
const taskAssignmentChangedTaskId = ref<string | null>(null)
const pendingAssignmentHistoryRefreshRevision = ref(0)
const appliedAssignmentHistoryRefreshRevision = ref(0)
const assignmentHistoryAutoRefreshRunning = ref(false)
const pendingTaskAssignmentRefresh = ref<PendingTaskAssignmentRefresh | null>(null)
const milestoneList = ref<Milestone[]>([])
const selectedProjectId = ref('')
const isTodayView = computed(() => route.query.view === 'today')
const isWeekView = computed(() => route.query.view === 'week')
const isAggregateView = computed(() => isTodayView.value || isWeekView.value)
const taskProjectContext = computed(() => parseTaskProjectContext(route.query))
const isTeamProjectContext = computed(() => taskProjectContext.value.type === 'team-project')
const selectedTeamId = computed(() =>
  taskProjectContext.value.type === 'team-project' ? taskProjectContext.value.teamId : '',
)
const canUsePersistentProjectTaskCache = computed(() => !isTeamProjectContext.value)
const boardView = computed(() =>
  route.query.view === 'today' || route.query.view === 'week' ? route.query.view : 'project',
)
const boardTransitionKey = computed(() =>
  boardView.value === 'project'
    ? `${isTeamProjectContext.value ? `team:${selectedTeamId.value}` : 'personal'}:${selectedProjectId.value || 'none'}`
    : String(boardView.value),
)
const displayContextKey = ref(`${PROJECT_CONTEXT_PREFIX}none`)
const displayPhase = ref<DisplayPhase>('loading')
const boardErrorMessage = ref(DEFAULT_BOARD_ERROR_MESSAGE)
const selectedProject = computed<Project | undefined>(() => {
  if (!isTeamProjectContext.value) {
    return projectList.value.find((project) => project.id === selectedProjectId.value)
  }

  const project = collaborationStore
    .getTeamProjects(selectedTeamId.value)
    .find((candidate) => candidate.id === selectedProjectId.value)
  if (!project) return undefined
  return {
    id: project.id,
    name: project.name,
    icon: project.icon ?? '',
    color: project.color ?? undefined,
  }
})
const selectedTeamContext = computed(() =>
  selectedTeamId.value ? collaborationStore.getTeam(selectedTeamId.value) : null,
)
const taskQuickCreateContext = computed<TaskQuickCreateContext>(() => {
  if (isAggregateView.value || !selectedProjectId.value) return { kind: 'unavailable' }

  if (isTeamProjectContext.value) {
    const team = selectedTeamContext.value
    return team ? { kind: 'team', role: team.role } : { kind: 'unavailable' }
  }

  return collaborationStore.currentUser ? { kind: 'personal' } : { kind: 'unavailable' }
})
const taskCreateAccess = computed(() => resolveTaskQuickCreateAccess(taskQuickCreateContext.value))
const canCreateTaskInCurrentContext = computed(() => taskCreateAccess.value.allowed)
const taskCreateDeniedMessage = computed(
  () => taskCreateAccess.value.deniedMessage || '当前不能创建任务。',
)
const newTaskAssigneeContext = computed<TaskAssigneeCandidateContext>(() => {
  if (isAggregateView.value || !selectedProjectId.value) return { kind: 'unavailable' }
  if (isTeamProjectContext.value) {
    return selectedTeamId.value
      ? { kind: 'team', teamId: selectedTeamId.value }
      : { kind: 'unavailable' }
  }
  return { kind: 'personal' }
})
const {
  options: newTaskAssigneeOptions,
  status: newTaskAssigneeStatus,
  loading: newTaskAssigneeLoading,
  errorMessage: newTaskAssigneeErrorMessage,
  loadCandidates: loadNewTaskAssigneeCandidates,
  retry: retryNewTaskAssigneeCandidates,
  reset: resetNewTaskAssigneeCandidates,
  isSelectableAssignee: isSelectableNewTaskAssignee,
} = useTaskAssigneeCandidates({
  context: newTaskAssigneeContext,
  store: collaborationStore,
})
const selectedProjectColor = computed(() =>
  isAggregateView.value ? '' : normalizeProjectColorValue(selectedProject.value?.color),
)
const pageTitle = computed(() => {
  if (isTodayView.value) return '今天截止'
  if (isWeekView.value) return '本周截止'
  return selectedProject.value?.name || '请选择清单'
})
const mainTaskSectionTitle = computed(() => {
  if (isTodayView.value) return '今天截止'
  if (isWeekView.value) return '本周截止'
  return '默认列表'
})
const shouldShowUnifiedAiButton = computed(
  () =>
    !isTeamProjectContext.value &&
    taskList.value.length > 0 &&
    (isTodayView.value || (!isAggregateView.value && Boolean(selectedProjectId.value))),
)
const todayAiOrderEntry = computed(
  () => aiPendingRegistry.boards[AI_PENDING_BOARDS.TASK_TODAY_AI_ORDER],
)
const listReplanPreviewEntry = computed(
  () => aiPendingRegistry.boards[AI_PENDING_BOARDS.TASK_LIST_REPLAN_PREVIEW],
)
const isFetchingTodayAiOrder = computed(() => todayAiOrderEntry.value.status === 'pending')
const isFetchingListReplanPreview = computed(
  () => listReplanPreviewEntry.value.status === 'pending',
)
const isUnifiedAiActionBusy = computed(() =>
  isTodayView.value ? isFetchingTodayAiOrder.value : isListReplanActionBusy.value,
)
const unifiedAiButtonHint = computed(() => {
  if (isTodayView.value) {
    return isFetchingTodayAiOrder.value ? 'AI 智能排序处理中...' : 'AI 智能排序'
  }
  if (isFetchingListReplanPreview.value) {
    return 'AI 清单重排处理中...'
  }
  if (pendingListReplanOperation.value) {
    return '查看 AI 清单重排预览'
  }
  return 'AI 清单重排'
})
const currentContextKey = computed(() => {
  if (isTodayView.value) return 'aggregate:today'
  if (isWeekView.value) return 'aggregate:week'
  if (isTeamProjectContext.value) {
    return `project:team:${selectedTeamId.value}:${selectedProjectId.value || 'none'}`
  }
  return `project:personal:${selectedProjectId.value || 'none'}`
})
const assignmentTask = computed(() => {
  const taskId = taskAssignmentDraft.value?.taskId
  return taskId ? findTaskById(taskList.value, taskId) : null
})
const taskAssignmentCandidateContext = computed<TaskAssigneeCandidateContext>(() => {
  const draft = taskAssignmentDraft.value
  if (!draft || draft.contextKey !== currentContextKey.value || !assignmentTask.value) {
    return { kind: 'unavailable' }
  }
  if (isTeamProjectContext.value) {
    return selectedTeamId.value
      ? { kind: 'team', teamId: selectedTeamId.value }
      : { kind: 'unavailable' }
  }
  return { kind: 'personal' }
})
const {
  options: taskAssignmentAssigneeOptions,
  status: taskAssignmentCandidatesStatus,
  loading: taskAssignmentCandidatesLoading,
  errorMessage: taskAssignmentCandidatesErrorMessage,
  loadCandidates: loadTaskAssignmentCandidates,
  retry: retryTaskAssignmentCandidateLoad,
  reset: resetTaskAssignmentCandidates,
  isSelectableAssignee: isSelectableTaskAssignmentAssignee,
} = useTaskAssigneeCandidates({
  context: taskAssignmentCandidateContext,
  store: collaborationStore,
})
const taskAssignmentRecoveryMode = computed<TaskAssignmentRecoveryMode>(() => {
  if (
    taskAssignmentMutationPhase.value === 'conflict-reconciling' ||
    taskAssignmentMutationPhase.value === 'uncertain-reconciling'
  )
    return 'reconciling'
  if (taskAssignmentMutationPhase.value === 'reconfirm-required') return 'reconfirm'
  if (taskAssignmentMutationPhase.value === 'recovery-error') return 'recovery-error'
  return 'none'
})
const taskAssignmentRecoveryActive = computed(() => taskAssignmentRecoveryMode.value !== 'none')
const taskAssignmentInitialAssigneeLabel = computed(() => {
  const userId = taskAssignmentDraft.value?.initialExpectedAssigneeUserId ?? null
  if (userId === null) return '未分配'
  const option = taskAssignmentAssigneeOptions.value.find((candidate) => candidate.value === userId)
  if (option) return option.label
  if (collaborationStore.currentUser?.id === userId) {
    return collaborationStore.currentUser.username?.trim() || `用户 #${userId}`
  }
  return `用户 #${userId}`
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
const newTaskAssigneeUserId = ref<string | null>(null)
const isNewTaskAssigneePickerOpen = ref(false)
const isAddingTask = ref(false)
const isAddingMilestone = ref(false)
const newMilestoneName = ref('')
const editingMilestoneId = ref('')
const editMilestoneName = ref('')

const isPriorityMenuOpen = ref(false)
const isDueDatePickerOpen = ref(false)
const isMilestoneMenuOpen = ref(false)
const isNewTaskMilestoneMenuOpen = ref(false)
const isNewTaskFlagMenuOpen = ref(false)
const isInputFocused = ref(false)
const suppressNextInputEnter = ref(false)
const shouldOpenNewTaskFlagMenuOnTriggerFocus = ref(false)
const newTaskActiveMilestoneIndex = ref(0)
const showDeleteTaskConfirm = ref(false)
const showDeleteMilestoneConfirm = ref(false)
const showCompletionQualityModal = ref(false)
const pendingDeleteTask = ref<TaskModel | null>(null)
const pendingDeleteMilestone = ref<{ id: string; name: string } | null>(null)
const pendingCompletionTask = ref<TaskModel | null>(null)
const priorityRowRef = ref<HTMLElement | null>(null)
const dueDateRowRef = ref<HTMLElement | null>(null)
const milestoneRowRef = ref<HTMLElement | null>(null)
const newTaskQuickCreateRef = ref<HTMLElement | null>(null)
const newTaskFlagTriggerRef = ref<HTMLButtonElement | null>(null)
const newTaskFlagMenuRef = ref<HTMLElement | null>(null)
const newTaskTitleInputRef = ref<HTMLInputElement | null>(null)
const newTaskAssigneePickerRef = ref<{ close: (restoreFocus?: boolean) => void } | null>(null)
const taskAssigneeEntryRef = ref<{
  focusChangeButton: () => void
  focusHistoryButton: () => void
} | null>(null)
const detailTitleInputRef = ref<HTMLTextAreaElement | null>(null)
const detailDescriptionInputRef = ref<HTMLTextAreaElement | null>(null)
const MIN_DETAIL_WIDTH = 320
const DEFAULT_DETAIL_WIDTH = 380
const MAX_DETAIL_WIDTH = 640

const sanitizeDetailWidth = (value: unknown) => {
  const width = Number(value)
  if (!Number.isFinite(width)) return DEFAULT_DETAIL_WIDTH
  return Math.min(MAX_DETAIL_WIDTH, Math.max(MIN_DETAIL_WIDTH, Math.round(width)))
}

const detailWidth = ref(sanitizeDetailWidth(localStorage.getItem('tick_detailWidth')))
const isResizingRight = ref(false)
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const projectLoadVersion = ref(0)
const taskLoadVersion = ref(0)
const milestoneLoadVersion = ref(0)
const milestoneCacheByProject = ref<Record<string, Milestone[]>>({})
const todayAiOrderMetaByTaskId = ref<Record<string, TodayAiOrderMeta>>({})
const isTaskViewMounted = ref(false)
const taskWriteRevisions = new Map<string, number>()

const captureTaskContextSnapshot = (): TaskContextSnapshot => ({
  session: captureAuthSessionSnapshot(),
  contextKey: currentContextKey.value,
  projectId: selectedProjectId.value,
  teamId: selectedTeamId.value,
})

const isTaskContextSnapshotActive = (snapshot: TaskContextSnapshot) => (
  isTaskViewMounted.value
  && isAuthSessionSnapshotActive(snapshot.session)
  && currentContextKey.value === snapshot.contextKey
  && (snapshot.projectId === '' || selectedProjectId.value === snapshot.projectId)
  && (snapshot.teamId === '' || selectedTeamId.value === snapshot.teamId)
)

const getCurrentActorId = () => {
  const activeActorId = getActiveCacheActor()
  if (activeActorId) return activeActorId
  const actorId = collaborationStore.currentUser?.id
  return actorId === undefined || actorId === null ? null : String(actorId)
}

const captureTaskWriteSnapshot = (operationKey: string, taskId?: string): TaskWriteSnapshot => {
  const operationRevision = (taskWriteRevisions.get(operationKey) || 0) + 1
  taskWriteRevisions.set(operationKey, operationRevision)
  const context = captureTaskContextSnapshot()
  return {
    context,
    actorId: getCurrentActorId() || context.session.actorId,
    operationKey,
    operationRevision,
    ...(taskId ? { taskId } : {}),
  }
}

const isTaskWriteRevisionCurrent = (snapshot: TaskWriteSnapshot) =>
  taskWriteRevisions.get(snapshot.operationKey) === snapshot.operationRevision

const isTaskWriteSnapshotActive = (
  snapshot: TaskWriteSnapshot,
  options: { allowMissingTask?: boolean } = {},
) => {
  if (!isTaskWriteRevisionCurrent(snapshot)) return false
  if (!snapshot.actorId || getCurrentActorId() !== snapshot.actorId) return false
  if (!isTaskViewMounted.value || !isAuthSessionSnapshotActive(snapshot.context.session)) {
    return false
  }
  if (!isTaskContextSnapshotActive(snapshot.context)) return false
  if (!snapshot.taskId) return true
  if (!selectedTask.value) return options.allowMissingTask === true
  return selectedTask.value.id === snapshot.taskId
}

const showTodayAiReasonDialog = ref(false)
const selectedTodayAiReason = ref<{ taskTitle: string; rank: number; reason: string } | null>(null)
const isListReplanDirty = ref(false)
const pendingListReplanOperation = ref<ListReplanPendingOperation | null>(null)
const listReplanPreviewPayload = ref<AiListReplanPreviewResponse | null>(null)
const showListReplanPreviewModal = ref(false)
const isListReplanConfirming = ref(false)
const isListReplanCancelling = ref(false)
const lastListReplanReminderRequestId = ref(0)
const selectedTaskTitleBaseline = ref('')
const selectedTaskDescriptionBaseline = ref<string | null>(null)

const isMobile = computed(() => viewportWidth.value < 768)
let boardSlowTimer: ReturnType<typeof setTimeout> | null = null
const newTaskFlagMenuId = 'new-task-flag-menu'

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

const getTaskProjectName = (task: TaskModel) =>
  projectById.value.get(String(task.projectId))?.name || '未命名清单'
const getTaskProjectIcon = (task: TaskModel): IconName =>
  getProjectIconName(projectById.value.get(String(task.projectId))?.icon)

const priorityOptions: PriorityOption[] = [
  { value: 3, text: '高', dotClass: 'priority-dot--urgent', textClass: 'priority-text--urgent' },
  { value: 2, text: '中', dotClass: 'priority-dot--high', textClass: 'priority-text--high' },
  { value: 1, text: '低', dotClass: 'priority-dot--low', textClass: 'priority-text--low' },
  { value: 0, text: '无', dotClass: 'priority-dot--medium', textClass: 'priority-text--medium' },
]

const getPriorityOption = (priority: number) =>
  priorityOptions.find((option) => option.value === priority) ||
  priorityOptions[priorityOptions.length - 1]!

const getListReplanPriorityChipClass = (priority: number) => {
  const option = getPriorityOption(priority)
  if (option.value === 3) return 'list-replan-priority-chip--urgent'
  if (option.value === 2) return 'list-replan-priority-chip--high'
  if (option.value === 1) return 'list-replan-priority-chip--low'
  return 'list-replan-priority-chip--none'
}

const completionQualityOptions: CompletionQualityOption[] = [
  {
    status: TASK_STATUS_DONE_BASIC,
    label: '差',
    emoji: '😢',
    toneClass: 'completion-option--danger',
    shortcutKey: '1',
  },
  {
    status: TASK_STATUS_DONE_STANDARD,
    label: '中',
    emoji: '😐',
    toneClass: 'completion-option--warning',
    shortcutKey: '2',
  },
  {
    status: TASK_STATUS_DONE_EXCELLENT,
    label: '好',
    emoji: '😄',
    toneClass: 'completion-option--success',
    shortcutKey: '3',
  },
]

const completionQualityShortcutStatusMap: Record<string, number> = {
  '1': TASK_STATUS_DONE_BASIC,
  '2': TASK_STATUS_DONE_STANDARD,
  '3': TASK_STATUS_DONE_EXCELLENT,
}

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

const applyTodayAiOrderPayload = (payload: unknown) => {
  const metaMap = createTodayAiOrderMetaMap(extractAiTodayOrderItems(payload))
  todayAiOrderMetaByTaskId.value = metaMap
  persistTodayAiOrderMetaToCache(metaMap)
  return true
}

const consumePendingTodayAiOrder = () => {
  const entry = todayAiOrderEntry.value
  if (entry.status !== 'success') return
  if (!isTodayView.value || !isTaskViewMounted.value || taskList.value.length === 0) return

  const applied = applyTodayAiOrderPayload(entry.responsePayload)
  if (applied) {
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.TASK_TODAY_AI_ORDER, entry.requestId)
  }
}

const remindListReplanPreviewReady = (entryRequestId: number, listId: string) => {
  if (entryRequestId <= lastListReplanReminderRequestId.value) return
  lastListReplanReminderRequestId.value = entryRequestId

  const listName = projectById.value.get(listId)?.name || '对应清单'
  toastStore.push({
    type: 'info',
    message: `AI 清单重排已完成，可返回「${listName}」查看预览。`,
    duration: 6000,
    action: {
      label: '前往查看',
      onClick: async () => {
        await router.push({ path: '/tasks', query: { projectId: listId } })
      },
    },
  })
}

const consumePendingListReplanPreview = () => {
  const entry = listReplanPreviewEntry.value
  if (entry.status !== 'success') return
  if (!isTaskViewMounted.value) return

  const requestMeta = (entry.requestMeta || null) as { listId?: unknown; dirty?: unknown } | null
  const listId = normalizeListId(requestMeta?.listId)
  if (!listId) {
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.TASK_LIST_REPLAN_PREVIEW, entry.requestId)
    return
  }

  const payload = normalizeListReplanPreviewPayload(entry.responsePayload)
  if (!payload) {
    toast.error('AI 返回格式异常，请稍后重试。')
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.TASK_LIST_REPLAN_PREVIEW, entry.requestId)
    return
  }

  if (isAggregateView.value || selectedProjectId.value !== listId) {
    remindListReplanPreviewReady(entry.requestId, listId)
    return
  }

  pendingListReplanOperation.value = {
    listId,
    operationId: payload.operationId,
    createdAt: new Date().toISOString(),
  }
  listReplanPreviewPayload.value = payload
  showListReplanPreviewModal.value = true
  if (requestMeta?.dirty) {
    isListReplanDirty.value = true
  }
  persistCurrentListReplanState()
  aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.TASK_LIST_REPLAN_PREVIEW, entry.requestId)
}

const getTodayAiOrderMeta = (task: TaskModel): TodayAiOrderMeta | null => {
  if (!isTodayView.value || isTaskCompleted(task.status)) return null
  const meta = todayAiOrderMetaByTaskId.value[String(task.id)]
  if (!meta || !Number.isFinite(meta.rank)) return null
  return meta
}

const openTodayAiReasonDialog = (task: TaskModel) => {
  const meta = getTodayAiOrderMeta(task)
  if (!meta) return
  selectedTodayAiReason.value = {
    taskTitle: task.title,
    rank: meta.rank,
    reason: meta.reason,
  }
  showTodayAiReasonDialog.value = true
}

const closeTodayAiReasonDialog = () => {
  showTodayAiReasonDialog.value = false
  selectedTodayAiReason.value = null
}

const listReplanPreviewItems = computed(
  () => listReplanPreviewPayload.value?.previewTasks || ([] as AiListReplanPreviewItem[]),
)
const listReplanChangedCount = computed(() => {
  const changedCountRaw = Number(listReplanPreviewPayload.value?.changedCount)
  if (Number.isFinite(changedCountRaw) && changedCountRaw >= 0) return Math.floor(changedCountRaw)
  return listReplanPreviewItems.value.length
})
const isListReplanActionBusy = computed(
  () =>
    isFetchingListReplanPreview.value ||
    isListReplanConfirming.value ||
    isListReplanCancelling.value,
)
const canConfirmListReplan = computed(() => Boolean(pendingListReplanOperation.value?.operationId))

const normalizeListReplanConfidence = (value: unknown) => {
  const confidence = Number(value)
  if (!Number.isFinite(confidence)) return 0
  return Math.max(0, Math.min(100, Math.round(confidence)))
}

const getDefaultListReplanStateEntry = (): ListReplanStateEntry => ({
  dirty: false,
  pendingOperation: null,
  previewPayload: null,
  updatedAt: Date.now(),
})

const upsertListReplanStateEntry = (listId: string, patch: Partial<ListReplanStateEntry>) => {
  const normalizedListId = normalizeListId(listId)
  if (!normalizedListId) return
  const stateMap = readListReplanStateMap()
  const current = stateMap[normalizedListId] || getDefaultListReplanStateEntry()
  stateMap[normalizedListId] = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  }
  writeListReplanStateMap(stateMap)
}

const resetListReplanRuntimeState = () => {
  pendingListReplanOperation.value = null
  listReplanPreviewPayload.value = null
  showListReplanPreviewModal.value = false
  isListReplanConfirming.value = false
  isListReplanCancelling.value = false
}

const persistCurrentListReplanState = () => {
  if (isAggregateView.value || isTeamProjectContext.value || !selectedProjectId.value) return
  const listId = selectedProjectId.value
  const pendingOperation =
    pendingListReplanOperation.value &&
    pendingListReplanOperation.value.listId === listId &&
    !isListReplanOperationExpired(pendingListReplanOperation.value)
      ? pendingListReplanOperation.value
      : null
  const previewPayload = pendingOperation ? listReplanPreviewPayload.value : null

  upsertListReplanStateEntry(listId, {
    dirty: isListReplanDirty.value,
    pendingOperation,
    previewPayload,
  })
}

const hydrateListReplanStateForList = (listId: string) => {
  if (isTeamProjectContext.value) {
    isListReplanDirty.value = false
    resetListReplanRuntimeState()
    return
  }

  const normalizedListId = normalizeListId(listId)
  if (!normalizedListId) {
    isListReplanDirty.value = false
    resetListReplanRuntimeState()
    return
  }

  const stateMap = readListReplanStateMap()
  const cached = stateMap[normalizedListId]
  if (!cached) {
    isListReplanDirty.value = false
    resetListReplanRuntimeState()
    return
  }

  isListReplanDirty.value = Boolean(cached.dirty)
  pendingListReplanOperation.value = cached.pendingOperation
  listReplanPreviewPayload.value = cached.pendingOperation ? cached.previewPayload : null
  showListReplanPreviewModal.value = false
  isListReplanConfirming.value = false
  isListReplanCancelling.value = false

  upsertListReplanStateEntry(normalizedListId, {
    dirty: isListReplanDirty.value,
    pendingOperation: pendingListReplanOperation.value,
    previewPayload: listReplanPreviewPayload.value,
  })
}

const hydrateListReplanDirtyForList = (listId: string) => {
  if (isTeamProjectContext.value) return false
  const normalizedListId = normalizeListId(listId)
  if (!normalizedListId) return false
  const stateMap = readListReplanStateMap()
  return Boolean(stateMap[normalizedListId]?.dirty)
}

const closeListReplanPreviewDialog = () => {
  showListReplanPreviewModal.value = false
}

const clearListReplanPreviewState = (
  options: { persistListId?: string; keepDirty?: boolean } = {},
) => {
  if (isTeamProjectContext.value) {
    isListReplanDirty.value = false
    resetListReplanRuntimeState()
    return
  }

  const keepDirty = options.keepDirty !== false
  const listId =
    normalizeListId(options.persistListId) ||
    normalizeListId(pendingListReplanOperation.value?.listId) ||
    normalizeListId(selectedProjectId.value)
  const stateMap = readListReplanStateMap()
  const isCurrentList = listId && listId === selectedProjectId.value && !isAggregateView.value
  const cachedDirty = listId ? Boolean(stateMap[listId]?.dirty) : false
  const nextDirty = keepDirty ? (isCurrentList ? isListReplanDirty.value : cachedDirty) : false

  resetListReplanRuntimeState()
  if (!keepDirty && isCurrentList) {
    isListReplanDirty.value = false
  }

  if (listId) {
    upsertListReplanStateEntry(listId, {
      dirty: nextDirty,
      pendingOperation: null,
      previewPayload: null,
    })
  }
}

const ensureFreshPendingListReplanOperation = (options: { notify?: boolean } = {}) => {
  const notify = options.notify !== false
  const pending = pendingListReplanOperation.value
  if (!pending) return true

  if (pending.listId !== selectedProjectId.value || isListReplanOperationExpired(pending)) {
    clearListReplanPreviewState({ persistListId: pending.listId, keepDirty: true })
    if (notify) {
      toast.warning('当前预览已过期，请重新生成。')
    }
    return false
  }

  return true
}

const markListReplanDirty = () => {
  if (isAggregateView.value || isTeamProjectContext.value || !selectedProjectId.value) return
  isListReplanDirty.value = true
  persistCurrentListReplanState()
}

const requestListReplanPreview = async () => {
  if (isTeamProjectContext.value) {
    toast.warning('团队项目的 AI 重排将在权限能力接入后开放。')
    return
  }

  if (isAggregateView.value || !selectedProjectId.value) {
    toast.warning('仅支持在单个清单视图中使用 AI 重排。')
    return
  }

  if (!ensureFreshPendingListReplanOperation({ notify: true })) return

  if (pendingListReplanOperation.value) {
    if (listReplanPreviewPayload.value) {
      showListReplanPreviewModal.value = true
      return
    }
    toast.warning('当前有待处理的重排预览，请先确认或取消。')
    return
  }

  if (!isListReplanDirty.value) {
    toast.warning('当前清单没有新的变化，暂不需要重排。')
    return
  }

  const listId = selectedProjectId.value
  const result = await runAiRequest<AiListReplanPreviewResponse>({
    board: AI_PENDING_BOARDS.TASK_LIST_REPLAN_PREVIEW,
    requestMeta: { listId, dirty: isListReplanDirty.value },
    request: () => aiListReplanPreviewApi({ listId }),
    successMessage: 'AI 重排预览响应完成。',
    errorMessage: 'AI 重排预览失败，请稍后重试。',
  })

  if (result.status === 'blocked') {
    toast.warning('AI 重排预览正在处理中，请稍候。')
    return
  }

  if (result.status !== 'success' || !result.ticket) return
  consumePendingListReplanPreview()
}

const confirmListReplanPreview = async () => {
  if (isListReplanConfirming.value) return
  if (!ensureFreshPendingListReplanOperation({ notify: true })) return
  const pending = pendingListReplanOperation.value
  if (!pending) return

  const confirmContextKey = currentContextKey.value
  const confirmListId = pending.listId
  isListReplanConfirming.value = true
  try {
    const confirmed = await aiListReplanConfirmApi({
      listId: pending.listId,
      operationId: pending.operationId,
    })

    if (confirmed === true) {
      clearListReplanPreviewState({ persistListId: pending.listId, keepDirty: false })
      if (
        isTaskViewMounted.value &&
        !isAggregateView.value &&
        selectedProjectId.value === confirmListId &&
        currentContextKey.value === confirmContextKey
      ) {
        await loadContextData(currentContextKey.value, {
          forceProjectRefresh: true,
          forceMilestoneRefresh: true,
          forceTaskRefresh: true,
        })
      }
      toast.success('AI 重排已确认并生效。')
      return
    }

    clearListReplanPreviewState({ persistListId: pending.listId, keepDirty: true })
    toast.warning('当前预览已失效，请重新生成。')
  } catch (error) {
    console.error('确认 AI 重排失败', error)
    toast.error('确认 AI 重排失败，请稍后重试。')
  } finally {
    isListReplanConfirming.value = false
  }
}

const cancelListReplanPreview = async () => {
  if (isListReplanCancelling.value) return
  if (!ensureFreshPendingListReplanOperation({ notify: true })) return
  const pending = pendingListReplanOperation.value
  if (!pending) return

  isListReplanCancelling.value = true
  try {
    const canceled = await aiListReplanCancelApi({ operationId: pending.operationId })
    if (canceled === true) {
      clearListReplanPreviewState({ persistListId: pending.listId, keepDirty: true })
      toast.success('已取消当前 AI 重排预览。')
      return
    }

    clearListReplanPreviewState({ persistListId: pending.listId, keepDirty: true })
    toast.warning('当前预览已不可用，已清理本地状态。')
  } catch (error) {
    console.error('取消 AI 重排预览失败', error)
    toast.error('取消 AI 重排预览失败，请稍后重试。')
  } finally {
    isListReplanCancelling.value = false
  }
}

const requestTodayAiOrder = async () => {
  if (!isTodayView.value) return
  const todayTasks = taskList.value
  if (todayTasks.length === 0) return

  const candidateTasks = todayTasks.filter((task) => !isTaskCompleted(task.status))
  if (candidateTasks.length === 0) {
    todayAiOrderMetaByTaskId.value = {}
    clearTaskTodayAiOrderCache()
    toast.warning('没有可排序的未完成任务。')
    return
  }

  const numericTaskIds = candidateTasks
    .map((task) => Number(task.id))
    .filter((id) => Number.isSafeInteger(id) && id > 0)
  const requestPayload: AiTodayOrderRecommendRequest = {
    timezone: resolveClientTimezone(),
    now: formatIsoLocalDateTimeSeconds(new Date()),
    strategy: AI_TODAY_ORDER_DEFAULT_STRATEGY,
    limit: Math.min(AI_TODAY_ORDER_MAX_LIMIT, candidateTasks.length),
  }
  if (numericTaskIds.length > 0) {
    requestPayload.taskIds = numericTaskIds.slice(0, AI_TODAY_ORDER_MAX_LIMIT)
  }

  const result = await runAiRequest({
    board: AI_PENDING_BOARDS.TASK_TODAY_AI_ORDER,
    requestMeta: {
      taskCount: candidateTasks.length,
      taskIds: requestPayload.taskIds || null,
      strategy: requestPayload.strategy,
      timezone: requestPayload.timezone,
      now: requestPayload.now,
    },
    request: () => aiTodayOrderRecommendApi(requestPayload),
    successMessage: 'AI 智能排序响应完成。',
    errorMessage: 'AI 智能排序失败，请稍后重试。',
  })

  if (result.status === 'blocked') {
    toast.warning('AI 智能排序正在处理中，请稍候。')
    return
  }

  if (result.status === 'error') {
    todayAiOrderMetaByTaskId.value = {}
    clearTaskTodayAiOrderCache()
    return
  }

  if (
    result.status !== 'success' ||
    !result.ticket ||
    !isTaskViewMounted.value ||
    !isTodayView.value
  )
    return

  const applied = applyTodayAiOrderPayload(result.payload)
  if (applied) {
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.TASK_TODAY_AI_ORDER, result.ticket.requestId)
  }
}

const handleUnifiedAiAction = () => {
  if (isTodayView.value) {
    void requestTodayAiOrder()
    return
  }
  void requestListReplanPreview()
}

const getTodayAiRank = (task: TaskModel) => {
  if (!isTodayView.value || isTaskCompleted(task.status)) return Number.POSITIVE_INFINITY
  const meta = todayAiOrderMetaByTaskId.value[String(task.id)]
  return meta && Number.isFinite(meta.rank) ? meta.rank : Number.POSITIVE_INFINITY
}

const getTaskDueDateTimestamp = (dueDate?: string | null) => {
  if (!dueDate) return Number.POSITIVE_INFINITY
  const timestamp = new Date(dueDate).getTime()
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

const compareTaskByDueDateThenPriority = (a: TaskModel, b: TaskModel) => {
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

const compareTodayTaskByCompletionThenAiThenDueDateThenPriority = (a: TaskModel, b: TaskModel) => {
  const isACompleted = isTaskCompleted(a.status)
  const isBCompleted = isTaskCompleted(b.status)
  if (isACompleted !== isBCompleted) {
    return isACompleted ? 1 : -1
  }

  const aiRankA = getTodayAiRank(a)
  const aiRankB = getTodayAiRank(b)
  if (aiRankA !== aiRankB) return aiRankA - aiRankB

  const dueDateDiff = getTaskDueDateTimestamp(a.dueDate) - getTaskDueDateTimestamp(b.dueDate)
  if (dueDateDiff !== 0) return dueDateDiff

  if (a.priority !== b.priority) return b.priority - a.priority
  return 0
}

const isMilestoneGroupAllCompleted = (group: {
  milestone: Milestone
  tasks: TaskModel[]
  progress: number
}) => group.tasks.length > 0 && group.tasks.every((task) => isTaskCompleted(task.status))

const sortTaskListForCurrentBoard = (tasks: TaskModel[]) => {
  if (isTodayView.value) {
    return [...tasks].sort(compareTodayTaskByCompletionThenAiThenDueDateThenPriority)
  }
  return [...tasks].sort(compareTaskByDueDateThenPriority)
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
  const weekStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + offsetToMonday,
  )
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)

  return {
    startDateKey: toDateKey(weekStart),
    endDateKey: toDateKey(weekEnd),
  }
}

const filterTasksByExistingProjects = (records: TaskModel[]) => {
  const existingProjectIds = new Set(projectList.value.map((project) => String(project.id)))
  return records.filter((task) => existingProjectIds.has(String(task.projectId)))
}

const filterAggregateTasks = (records: TaskModel[]) => {
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

const currentDueDateLabel = computed(
  () => normalizeTaskDueDate(selectedTask.value?.dueDate) || '设置截止日期',
)

const selectedEditContentUi = computed(() =>
  resolveTaskActionUiState(selectedTask.value, 'editContent'),
)
const selectedReorganizeUi = computed(() =>
  resolveTaskActionUiState(selectedTask.value, 'reorganize'),
)
const selectedDeleteUi = computed(() => resolveTaskActionUiState(selectedTask.value, 'delete'))
const selectedAssignUi = computed(() => resolveTaskActionUiState(selectedTask.value, 'assign'))
const selectedAssigneePresentation = computed(() =>
  resolveTaskAssigneePresentation({
    task: selectedTask.value,
    currentUser: collaborationStore.currentUser,
    teamMembers: selectedTeamId.value
      ? collaborationStore.getTeamMembers(selectedTeamId.value)
      : [],
    teamMembersReady: selectedTeamId.value
      ? collaborationStore.teamMembersByTeamId[selectedTeamId.value]?.loadState.status === 'ready'
      : false,
    isTeamProject: isTeamProjectContext.value,
  }),
)
const selectedTaskIsReadOnly = computed(() => {
  const capabilities = selectedTask.value?.capabilities
  if (!capabilities) return false
  return !Object.values(capabilities).some((allowed) => allowed === true)
})

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
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    )
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

  const viewportLimit = Math.max(
    220,
    window.innerHeight - textarea.getBoundingClientRect().top - 20,
  )
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
  if (newWidth >= MIN_DETAIL_WIDTH && newWidth <= MAX_DETAIL_WIDTH) {
    detailWidth.value = newWidth
  }
}

const stopResizeRight = () => {
  isResizingRight.value = false
  document.removeEventListener('mousemove', handleMouseMoveRight)
  document.removeEventListener('mouseup', stopResizeRight)
  document.body.style.userSelect = ''
  localStorage.setItem('tick_detailWidth', sanitizeDetailWidth(detailWidth.value).toString())
}

const vFocus = {
  mounted(el: HTMLElement) {
    el.focus()
  },
}

const navigateToProject = (projectId: string) => {
  writeSelectedProjectIdCache(projectId)
  void router.push(buildPersonalProjectRoute(projectId))
}

const syncSelectedProject = () => {
  if (isAggregateView.value) {
    selectedProjectId.value = ''
    return
  }

  const context = taskProjectContext.value
  if (context.type === 'team-project') {
    selectedProjectId.value = context.projectId
    return
  }

  if (context.type === 'personal-project') {
    selectedProjectId.value = context.projectId
    writeSelectedProjectIdCache(context.projectId)
    return
  }

  if (context.type === 'invalid') {
    selectedProjectId.value = ''
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
const hasRouteProjectId = () =>
  typeof route.query.projectId === 'string' && route.query.projectId.length > 0
const ensureSelectedProjectFromList = async () => {
  if (
    isAggregateView.value ||
    isTeamProjectContext.value ||
    selectedProjectId.value ||
    projectList.value.length === 0
  )
    return
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
  const contextSnapshot = options.contextSnapshot || captureTaskContextSnapshot()
  const isActive = () => (
    requestVersion === projectLoadVersion.value
    && isTaskContextSnapshotActive(contextSnapshot)
  )

  if (!isActive()) return staleOutcome()

  const cachedRecords = !forceRefresh ? readProjectListCache<Project>(0) : null

  if (cachedRecords) {
    projectList.value = cachedRecords
  }

  if (cachedRecords && cachedRecords.length > 0 && !forceRefresh) {
    await ensureSelectedProjectFromList()
    if (!isActive()) return staleOutcome()
    return okOutcome()
  }

  try {
    const res = await fetchProjectList({ status: 0 })
    if (!isActive()) return staleOutcome()
    const records = extractListPayload<Project>(res)
    if (!records) {
      throw new Error('project-list-shape-invalid')
    }
    if (!isActive()) return staleOutcome()
    projectList.value = records
    writeProjectListCache(0, projectList.value)

    await ensureSelectedProjectFromList()
    if (!isActive()) return staleOutcome()
    return okOutcome()
  } catch (error) {
    if (!isActive()) return staleOutcome()
    console.error('加载项目失败', error)
    return errorOutcome(error)
  }
}

const syncSelectedTaskFromList = () => {
  if (selectedTask.value) {
    selectedTask.value = findTaskById(taskList.value, selectedTask.value.id)
    selectedTaskTitleBaseline.value = selectedTask.value?.title || ''
    selectedTaskDescriptionBaseline.value = selectedTask.value?.description ?? null
  }
}

const resolveLatestTask = (taskOrId: TaskModel | string) => {
  const taskId = typeof taskOrId === 'string' ? taskOrId : taskOrId.id
  return findTaskById(taskList.value, taskId)
}

const ensureTaskActionAllowed = (
  taskOrId: TaskModel | string,
  action: TaskAction,
): TaskModel | null => {
  const latestTask = resolveLatestTask(taskOrId)
  if (latestTask && canPerformTaskAction(latestTask, action)) {
    return latestTask
  }

  toast.warning(TASK_ACTION_DENIED_MESSAGE[action])
  return null
}

const isTaskStatusActionDisabled = (task: TaskModel) => (
  !canPerformTaskAction(task, 'changeStatus') || isTaskStatusMutationBlocked(task.id)
)

const resolveTaskStatusActionTitle = (task: TaskModel) => {
  if (!canPerformTaskAction(task, 'changeStatus')) {
    return TASK_ACTION_DENIED_MESSAGE.changeStatus
  }
  const mutation = getTaskStatusMutationState(task.id)
  if (!mutation) return '切换任务状态'
  if (mutation.phase === 'submitting') return '任务状态正在提交'
  if (mutation.phase === 'uncertain') return '上一次状态结果尚未确认，请打开任务详情恢复'
  if (mutation.phase === 'committed-refresh-error') return '状态已提交，请重新加载最新任务'
  return '正在核对最新任务状态'
}

const selectedTaskStatusMutation = computed<TaskStatusMutationState | null>(() => (
  selectedTask.value ? getTaskStatusMutationState(selectedTask.value.id) : null
))

const failClosedTaskCapabilities = (taskId: string) => {
  taskList.value = taskList.value.map((task) =>
    task.id === taskId ? { ...task, capabilities: DENY_ALL_TASK_CAPABILITIES } : task,
  )
  syncSelectedTaskFromList()
}

const recoverTaskPermissionDenial = async (
  taskId: string,
  contextSnapshot?: TaskWriteSnapshot,
  options: { allowMissingTask?: boolean } = {},
) => {
  if (
    contextSnapshot &&
    !isTaskWriteSnapshotActive(contextSnapshot, options)
  ) return false
  failClosedTaskCapabilities(taskId)
  const outcome = await loadTasks({
    forceRefresh: true,
    ...(contextSnapshot ? { contextSnapshot: contextSnapshot.context } : {}),
  })
  if (contextSnapshot && !isTaskWriteSnapshotActive(contextSnapshot, options)) {
    return false
  }
  return outcome.status === 'ok'
}

const handleTaskMutationFailure = async (
  error: unknown,
  taskId: string,
  fallbackMessage: string,
  contextSnapshot?: TaskWriteSnapshot,
) => {
  if (contextSnapshot && !isTaskWriteSnapshotActive(contextSnapshot)) return false
  if (classifyApiError(error) === 'PERMISSION_DENIED') {
    const refreshed = await recoverTaskPermissionDenial(taskId, contextSnapshot)
    if (contextSnapshot && !refreshed) return false
    if (contextSnapshot && !isTaskWriteSnapshotActive(contextSnapshot, { allowMissingTask: true })) {
      return false
    }
    toast.warning('任务权限已发生变化，已刷新最新权限。')
    return true
  }

  if (contextSnapshot && !isTaskWriteSnapshotActive(contextSnapshot)) return false
  toast.error(fallbackMessage)
  return false
}

interface TaskPageResponse {
  records?: unknown[]
  current?: number
  size?: number
  total?: number
}

const fetchAllTasksByProject = async (projectId: string, isStale: () => boolean) => {
  const aggregated: TaskModel[] = []
  let page = 1

  for (let index = 0; index < AGGREGATE_MAX_PAGES; index += 1) {
    if (isStale()) return []

    const raw = await fetchTaskList({
      projectId,
      current: page,
      size: AGGREGATE_PAGE_SIZE,
    })
    const res = extractTaskPagePayload(raw)

    if (isStale()) return []

    const records = normalizeTaskRecords(res.records)
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
  const contextSnapshot = options.contextSnapshot || captureTaskContextSnapshot()
  const isStaleRequest = () => (
    requestVersion !== taskLoadVersion.value
    || !isTaskContextSnapshotActive(contextSnapshot)
  )
  let hasCachedSnapshot = false

  if (isStaleRequest()) return staleOutcome()

  if (isAggregateView.value) {
    if (projectList.value.length === 0) {
      taskList.value = []
      selectedTask.value = null
      if (isTodayView.value) {
        todayAiOrderMetaByTaskId.value = {}
        clearTaskTodayAiOrderCache()
      }
      return okOutcome()
    }

    if (!forceRefresh) {
      const cachedAllProjectsTasks = readAllProjectsTaskCache()
      if (cachedAllProjectsTasks) {
        const allRecords = Object.values(cachedAllProjectsTasks).flatMap((items) =>
          Array.isArray(items) ? items : [],
        )
        const normalizedRecords = normalizeTaskRecords(allRecords)
        const filteredRecords = filterAggregateTasks(
          filterTasksByExistingProjects(normalizedRecords),
        )
        if (isTodayView.value && filteredRecords.length === 0) {
          todayAiOrderMetaByTaskId.value = {}
          clearTaskTodayAiOrderCache()
        }
        taskList.value = sortTaskListForCurrentBoard(filteredRecords)
        syncSelectedTaskFromList()
        hasCachedSnapshot = true
      }
    }

    try {
      const responses = await Promise.all(
        projectList.value.map((project) => fetchAllTasksByProject(project.id, isStaleRequest)),
      )
      if (isStaleRequest()) return staleOutcome()
      const records = responses.flat()
      const filteredRecords = filterAggregateTasks(filterTasksByExistingProjects(records))
      if (isTodayView.value && filteredRecords.length === 0) {
        todayAiOrderMetaByTaskId.value = {}
        clearTaskTodayAiOrderCache()
      }
      taskList.value = sortTaskListForCurrentBoard(filteredRecords)
      writeAggregateTaskCacheFromRecords(records)
      syncSelectedTaskFromList()
      return okOutcome()
    } catch (error) {
      if (isStaleRequest()) return staleOutcome()
      console.error('加载今日任务失败', error)
      if (hasCachedSnapshot) {
        toast.error('任务权限校验失败，当前缓存仅供查看。')
        return okOutcome()
      }
      return errorOutcome(error)
    }
  }

  if (!selectedProjectId.value) {
    taskList.value = []
    selectedTask.value = null
    return okOutcome()
  }

  if (!forceRefresh && canUsePersistentProjectTaskCache.value) {
    const cachedProjectTasks = readTaskCache(selectedProjectId.value)
    if (cachedProjectTasks) {
      taskList.value = normalizeTaskRecords(cachedProjectTasks)
      syncSelectedTaskFromList()
      hasCachedSnapshot = true
    }
  }

  const requestProjectId = selectedProjectId.value
  try {
    const raw = await fetchTaskList({
      projectId: requestProjectId,
      current: 1,
      size: 100,
    })
    if (isStaleRequest()) return staleOutcome()
    if (requestProjectId !== selectedProjectId.value) return staleOutcome()
    const rawRecords = extractListPayload<unknown>(raw)
    const records = rawRecords ? normalizeTaskRecords(rawRecords) : null
    if (!records) {
      throw new Error('task-list-shape-invalid')
    }
    taskList.value = records
    if (canUsePersistentProjectTaskCache.value) {
      writeTaskCache(requestProjectId, taskList.value)
      syncAggregateTaskCacheByProject(requestProjectId, taskList.value)
    }
    syncSelectedTaskFromList()
    return okOutcome()
  } catch (error) {
    if (isStaleRequest()) return staleOutcome()
    console.error('加载任务失败', error)
    if (hasCachedSnapshot) {
      toast.error('任务权限校验失败，当前缓存仅供查看。')
      return okOutcome()
    }
    return errorOutcome(error)
  }
}

const loadMilestones = async (options: LoadOptions = {}): Promise<LoadOutcome> => {
  const forceRefresh = options.forceRefresh === true
  const requestVersion = ++milestoneLoadVersion.value
  const contextSnapshot = options.contextSnapshot || captureTaskContextSnapshot()
  const isActive = () => (
    requestVersion === milestoneLoadVersion.value
    && isTaskContextSnapshotActive(contextSnapshot)
  )

  if (!isActive()) return staleOutcome()

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
    const raw = await fetchMilestoneList({ projectId: requestProjectId })
    if (!isActive()) return staleOutcome()
    if (requestProjectId !== selectedProjectId.value || isAggregateView.value) return staleOutcome()
    const milestones = extractListPayload<Milestone>(raw)
    if (!milestones) {
      throw new Error('milestone-list-shape-invalid')
    }
    const sortedMilestones = milestones.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
    milestoneList.value = sortedMilestones
    milestoneCacheByProject.value = {
      ...milestoneCacheByProject.value,
      [requestProjectId]: sortedMilestones,
    }
    return okOutcome()
  } catch (error) {
    if (!isActive()) return staleOutcome()
    console.error('加载里程碑失败', error)
    return errorOutcome(error)
  }
}

const replaceWithPersonalProjectFallback = async () => {
  const fallbackProjectId = resolvePersonalProjectFallback(
    projectList.value,
    readSelectedProjectIdCache(),
  )

  if (fallbackProjectId) {
    writeSelectedProjectIdCache(fallbackProjectId)
    await router.replace(buildPersonalProjectRoute(fallbackProjectId))
    return
  }

  selectedProjectId.value = ''
  await router.replace({ path: '/tasks' })
}

const ensureRouteProjectContext = async (
  contextSnapshot?: TaskContextSnapshot,
): Promise<LoadOutcome> => {
  const isActive = () => !contextSnapshot || isTaskContextSnapshotActive(contextSnapshot)
  if (!isActive()) return staleOutcome()

  const context = taskProjectContext.value
  if (context.type === 'aggregate' || context.type === 'empty') return okOutcome()

  if (context.type === 'invalid') {
    await replaceWithPersonalProjectFallback()
    return staleOutcome()
  }

  if (context.type === 'personal-project') {
    if (projectList.value.some((project) => project.id === context.projectId)) return okOutcome()

    const refreshOutcome = await loadProjects({ forceRefresh: true, contextSnapshot })
    if (!isActive()) return staleOutcome()
    if (refreshOutcome.status !== 'ok') return refreshOutcome
    if (projectList.value.some((project) => project.id === context.projectId)) return okOutcome()

    await replaceWithPersonalProjectFallback()
    return staleOutcome()
  }

  const restoreResult = await collaborationStore.restoreTeamProjectContext(
    context.teamId,
    context.projectId,
  )
  if (!isActive()) return staleOutcome()
  if (restoreResult.kind === 'ready') return okOutcome()
  if (restoreResult.kind === 'retryable-error') {
    return errorOutcome(
      new Error(`团队项目上下文暂时无法恢复（${restoreResult.errorKind}），请重试。`),
    )
  }

  await replaceWithPersonalProjectFallback()
  return staleOutcome()
}

const loadContextData = async (contextKey: string, options: ContextLoadOptions = {}) => {
  enterBoardLoading(contextKey)
  const contextSnapshot = options.contextSnapshot || captureTaskContextSnapshot()
  const isActive = () => (
    isTaskContextSnapshotActive(contextSnapshot)
    && displayContextKey.value === contextKey
  )

  if (!isActive()) return

  const projectContext = isProjectContextKey(contextKey)
  const projectOutcome = await loadProjects({
    forceRefresh: options.forceProjectRefresh === true,
    contextSnapshot,
  })
  if (!isActive()) return

  if (projectOutcome.status === 'error') {
    markBoardError(contextKey, projectOutcome.error)
    return
  }

  const routeContextOutcome = await ensureRouteProjectContext(contextSnapshot)
  if (!isActive()) return
  if (routeContextOutcome.status === 'stale') return
  if (routeContextOutcome.status === 'error') {
    markBoardError(contextKey, routeContextOutcome.error)
    return
  }

  const [milestoneOutcome, taskOutcome] = await Promise.all([
    loadMilestones({
      forceRefresh: options.forceMilestoneRefresh === true,
      contextSnapshot,
    }),
    loadTasks({
      forceRefresh: options.forceTaskRefresh === true,
      contextSnapshot,
    }),
  ])

  if (!isActive()) return

  const outcomes = [projectOutcome, routeContextOutcome, milestoneOutcome, taskOutcome]
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
  void loadContextData(currentContextKey.value, {
    forceProjectRefresh: true,
    forceMilestoneRefresh: !isAggregateView.value,
    forceTaskRefresh: true,
  })
}

const addTask = async () => {
  if (isAddingTask.value) return
  if (suppressNextInputEnter.value) {
    suppressNextInputEnter.value = false
    return
  }
  if (isNewTaskFlagMenuOpen.value) return
  if (isNewTaskAssigneePickerOpen.value) return
  if (!canCreateTaskInCurrentContext.value) {
    toast.error(taskCreateDeniedMessage.value)
    return
  }
  if (!newTaskTitle.value.trim() || !selectedProjectId.value) return

  const createContext = taskQuickCreateContext.value
  if (createContext.kind === 'unavailable') return

  if (
    createContext.kind === 'team' &&
    newTaskAssigneeUserId.value !== null &&
    !isSelectableNewTaskAssignee(newTaskAssigneeUserId.value)
  ) {
    toast.error('负责人列表已发生变化，请重新选择。')
    return
  }

  const writeSnapshot = captureTaskWriteSnapshot('task:create')
  const createProjectId = selectedProjectId.value
  isAddingTask.value = true
  try {
    const finalTitle = newTaskTitle.value.trim().slice(0, TASK_TITLE_MAX_LENGTH)
    await addTaskApi(
      buildTaskQuickCreatePayload({
        title: finalTitle,
        projectId: createProjectId,
        milestoneId: newTaskMilestoneId.value || null,
        context: createContext.kind,
        assigneeUserId: newTaskAssigneeUserId.value,
      }),
    )
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    markListReplanDirty()
    resetNewTaskDraft({ blurInput: true })
    isNewTaskMilestoneMenuOpen.value = false
    await loadTasks({ forceRefresh: true, contextSnapshot: writeSnapshot.context })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
  } catch {
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    toast.error('添加任务失败，请检查网络后重试。')
  } finally {
    if (isTaskWriteRevisionCurrent(writeSnapshot)) {
      isAddingTask.value = false
    }
  }
}

const applyTaskStatusSnapshot = (
  state: TaskStatusMutationState,
  status: number,
  completedAt: string | null,
) => {
  if (state.command.contextKey !== currentContextKey.value) return
  const currentTask = findTaskById(taskList.value, state.command.taskId)
  if (!currentTask) return
  currentTask.status = status
  currentTask.completedAt = completedAt
}

const reconcileTaskStatusFacts = async (
  state: TaskStatusMutationState,
  options: { committed: boolean; failureMessage: string },
) => {
  const sessionSnapshot = captureAuthSessionSnapshot()
  const isActive = () =>
    isAuthSessionSnapshotActive(sessionSnapshot) &&
    state.command.contextKey === currentContextKey.value

  if (!isActive()) {
    completeTaskStatusMutation(state.command.taskId)
    return false
  }

  const outcome = await loadTasks({ forceRefresh: true })
  if (!isActive()) {
    completeTaskStatusMutation(state.command.taskId)
    return false
  }

  if (outcome.status !== 'ok') {
    failClosedTaskCapabilities(state.command.taskId)
    if (options.committed) {
      markTaskStatusCommittedRefreshError(state.command.taskId, options.failureMessage)
    } else {
      markTaskStatusFactRefreshError(state.command.taskId, options.failureMessage)
    }
    toast.warning(options.failureMessage)
    return false
  }

  const refreshedTask = findTaskById(taskList.value, state.command.taskId)
  completeTaskStatusMutation(state.command.taskId)
  if (!refreshedTask) {
    if (selectedTask.value?.id === state.command.taskId) closeDetail()
    toast.warning('任务已不存在或当前不可访问。')
    return false
  }
  return true
}

const handleTaskStatusMutationOutcome = async (outcome: TaskStatusMutationOutcome) => {
  if (outcome.kind === 'ignored' || outcome.kind === 'stale') return false

  const { state } = outcome
  const { command } = state
  if (outcome.kind === 'success') {
    applyTaskStatusSnapshot(state, outcome.result.finalStatus, outcome.result.completedAt)
    if (claimTaskStatusChangedSideEffect(command.taskId)) markListReplanDirty()
    return reconcileTaskStatusFacts(state, {
      committed: true,
      failureMessage: '任务状态已提交，但最新任务信息加载失败，请重新加载后再操作。',
    })
  }

  applyTaskStatusSnapshot(state, command.expectedStatus, command.previousCompletedAt)

  if (
    outcome.errorKind === 'NETWORK'
    || outcome.errorKind === 'SERVER'
    || outcome.errorKind === 'UNKNOWN'
  ) {
    toast.warning(state.errorMessage || '任务状态结果尚未确认，请重试原请求或刷新最新状态。')
    return false
  }

  if (outcome.errorKind === 'AUTHENTICATION_REQUIRED') {
    completeTaskStatusMutation(command.taskId)
    return false
  }

  if (outcome.errorKind === 'PERMISSION_DENIED') {
    failClosedTaskCapabilities(command.taskId)
  }

  const safeMessage = outcome.errorKind === 'CONFLICT'
    ? '任务状态已被其他操作修改，已刷新最新状态。'
    : outcome.errorKind === 'PERMISSION_DENIED'
      ? '任务状态权限已发生变化，已刷新最新权限。'
      : outcome.errorKind === 'NOT_FOUND'
        ? '任务已不存在或当前不可访问。'
        : '状态变更请求无法应用，已刷新最新任务。'
  const refreshed = await reconcileTaskStatusFacts(state, {
    committed: false,
    failureMessage: '最新任务状态加载失败，请重新加载后再操作。',
  })
  if (refreshed) toast.warning(safeMessage)
  return false
}

const setTaskStatus = async (task: TaskModel, nextStatus: number) => {
  const currentTask = ensureTaskActionAllowed(task, 'changeStatus')
  if (!currentTask) return false
  if (isTaskStatusMutationBlocked(currentTask.id)) {
    toast.warning('该任务的上一次状态变更尚未确认，请先恢复最新状态。')
    return false
  }

  const previousStatus = currentTask.status
  const previousCompletedAt = currentTask.completedAt
  currentTask.status = nextStatus
  const outcome = await submitNewTaskStatusMutation({
    taskId: currentTask.id,
    projectId: currentTask.projectId,
    contextKey: currentContextKey.value,
    expectedStatus: previousStatus,
    targetStatus: nextStatus,
    previousCompletedAt,
  })
  return handleTaskStatusMutationOutcome(outcome)
}

const retrySelectedTaskStatusRequest = async () => {
  const taskId = selectedTask.value?.id
  if (!taskId) return
  const state = getTaskStatusMutationState(taskId)
  if (!state || state.phase !== 'uncertain') return

  applyTaskStatusSnapshot(state, state.command.targetStatus, state.command.previousCompletedAt)
  const outcome = await retryUncertainTaskStatusMutation(taskId)
  await handleTaskStatusMutationOutcome(outcome)
}

const refreshSelectedTaskStatusFacts = async () => {
  const taskId = selectedTask.value?.id
  if (!taskId) return
  const currentState = getTaskStatusMutationState(taskId)
  if (!currentState) return
  const previousPhase = currentState.phase
  const state = previousPhase === 'uncertain'
    ? beginTaskStatusFactReconciliation(taskId)
    : beginTaskStatusFactRefreshRetry(taskId)
  if (!state) return

  const sessionSnapshot = captureAuthSessionSnapshot()
  const outcome = await loadTasks({ forceRefresh: true })
  if (
    !isAuthSessionSnapshotActive(sessionSnapshot) ||
    state.command.contextKey !== currentContextKey.value
  ) {
    completeTaskStatusMutation(taskId)
    return
  }
  if (outcome.status !== 'ok') {
    failClosedTaskCapabilities(taskId)
    if (previousPhase === 'uncertain') {
      restoreUncertainTaskStatusMutation(
        taskId,
        '最新任务状态加载失败，仍可重试原请求或再次刷新。',
      )
    } else {
      markTaskStatusFactRefreshError(taskId, '最新任务状态加载失败，请重新加载后再操作。')
    }
    toast.warning('最新任务状态加载失败，请稍后重试。')
    return
  }

  const refreshedTask = findTaskById(taskList.value, taskId)
  if (
    previousPhase === 'uncertain'
    && refreshedTask?.status === state.command.targetStatus
    && state.command.expectedStatus !== state.command.targetStatus
  ) {
    markListReplanDirty()
    toast.info('任务状态已经生效，已同步最新状态。')
  }
  completeTaskStatusMutation(taskId)
  if (!refreshedTask) {
    closeDetail()
    toast.warning('任务已不存在或当前不可访问。')
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

const toggleTaskStatus = async (task: TaskModel) => {
  const currentTask = ensureTaskActionAllowed(task, 'changeStatus')
  if (!currentTask) return

  if (isTaskCompleted(currentTask.status)) {
    try {
      await setTaskStatus(currentTask, TASK_STATUS_TODO)
    } catch {
      // toast already handled in setTaskStatus
    }
    return
  }
  pendingCompletionTask.value = currentTask
  showCompletionQualityModal.value = true
}

const handleCompletionQualityShortcutKeydown = (event: KeyboardEvent) => {
  if (!showCompletionQualityModal.value || !pendingCompletionTask.value) return
  if (event.defaultPrevented || event.isComposing) return
  if (event.ctrlKey || event.metaKey || event.altKey) return

  const nextStatus = completionQualityShortcutStatusMap[event.key]
  if (nextStatus === undefined) return

  event.preventDefault()
  event.stopPropagation()
  void confirmCompletionQuality(nextStatus)
}

const selectTask = (task: TaskModel) => {
  closeTaskScopedInteractions()
  selectedTask.value = task
  selectedTaskTitleBaseline.value = task.title
  selectedTaskDescriptionBaseline.value = task.description
  isNewTaskMilestoneMenuOpen.value = false
}

const closeDetail = () => {
  closeTaskScopedInteractions()
  selectedTask.value = null
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

const newTaskMilestoneLabel = computed(() => {
  if (!newTaskMilestoneId.value) return '默认列表'
  const matched = milestoneList.value.find((milestone) => milestone.id === newTaskMilestoneId.value)
  return matched?.name || '默认列表'
})

const newTaskPersonalAssigneeLabel = computed(
  () => newTaskAssigneeOptions.value[0]?.label || '当前用户',
)

const getNewTaskFlagOptionId = (index: number) => `new-task-flag-option-${index}`

const isNewTaskMilestoneSelected = (value: string | null) => {
  if (value === null) return newTaskMilestoneId.value === ''
  return newTaskMilestoneId.value === value
}

const getSelectedNewTaskMilestoneIndex = () => {
  const selectedIndex = milestoneOptions.value.findIndex((option) =>
    isNewTaskMilestoneSelected(option.value),
  )
  return selectedIndex >= 0 ? selectedIndex : 0
}

const normalizeNewTaskActiveMilestoneIndex = () => {
  const total = milestoneOptions.value.length
  if (total <= 0) {
    newTaskActiveMilestoneIndex.value = 0
    return
  }

  newTaskActiveMilestoneIndex.value = Math.min(
    Math.max(newTaskActiveMilestoneIndex.value, 0),
    total - 1,
  )
}

const syncNewTaskActiveMilestoneIndex = () => {
  newTaskActiveMilestoneIndex.value = getSelectedNewTaskMilestoneIndex()
  normalizeNewTaskActiveMilestoneIndex()
}

watch(
  [milestoneOptions, newTaskMilestoneId],
  () => {
    syncNewTaskActiveMilestoneIndex()
  },
  { immediate: true },
)

const selectedMilestoneValue = computed(() => {
  const milestoneId = selectedTask.value?.milestoneId
  if (!milestoneId || String(milestoneId) === '0') return null
  return String(milestoneId)
})

const deleteTaskConfirmTitle = computed(() => {
  if (!pendingDeleteTask.value) return '确认删除任务？'
  return `确认删除任务“${pendingDeleteTask.value.title}”？`
})

const deleteMilestoneConfirmTitle = computed(() => {
  if (!pendingDeleteMilestone.value) return '确认删除阶段？'
  return `确认删除阶段“${pendingDeleteMilestone.value.name}”？`
})

const closeNewTaskQuickCreateMenus = () => {
  isNewTaskFlagMenuOpen.value = false
  shouldOpenNewTaskFlagMenuOnTriggerFocus.value = false
  isNewTaskAssigneePickerOpen.value = false
  newTaskAssigneePickerRef.value?.close(false)
}

const collapseNewTaskQuickCreate = () => {
  closeNewTaskQuickCreateMenus()
  isInputFocused.value = false
}

const resetNewTaskDraft = (options: { blurInput?: boolean } = {}) => {
  newTaskTitle.value = ''
  newTaskMilestoneId.value = ''
  newTaskAssigneeUserId.value = null
  newTaskActiveMilestoneIndex.value = 0
  suppressNextInputEnter.value = false
  shouldOpenNewTaskFlagMenuOnTriggerFocus.value = false
  resetNewTaskAssigneeCandidates()
  collapseNewTaskQuickCreate()
  if (options.blurInput) {
    newTaskTitleInputRef.value?.blur()
  }
}

const isWithinNewTaskQuickCreate = (node: Node | null) => {
  if (!node || !newTaskQuickCreateRef.value) return false
  return newTaskQuickCreateRef.value.contains(node)
}

const setNewTaskActiveMilestoneIndex = (index: number) => {
  newTaskActiveMilestoneIndex.value = index
  normalizeNewTaskActiveMilestoneIndex()
}

const armInputEnterSuppression = () => {
  suppressNextInputEnter.value = true
  setTimeout(() => {
    suppressNextInputEnter.value = false
  }, 0)
}

const moveNewTaskActiveMilestoneIndex = (direction: 1 | -1) => {
  const total = milestoneOptions.value.length
  if (total <= 0) return
  const offset = (((newTaskActiveMilestoneIndex.value + direction) % total) + total) % total
  newTaskActiveMilestoneIndex.value = offset
}

const openNewTaskFlagMenu = () => {
  isNewTaskAssigneePickerOpen.value = false
  newTaskAssigneePickerRef.value?.close(false)
  isNewTaskFlagMenuOpen.value = true
  syncNewTaskActiveMilestoneIndex()
}

const selectNewTaskMilestone = (
  value: string | null,
  options: {
    focusInput?: boolean
    suppressEnter?: boolean
  } = {},
) => {
  newTaskMilestoneId.value = value ?? ''
  syncNewTaskActiveMilestoneIndex()
  isNewTaskFlagMenuOpen.value = false
  shouldOpenNewTaskFlagMenuOnTriggerFocus.value = false
  if (options.suppressEnter) {
    armInputEnterSuppression()
  }
  if (!options.focusInput) return

  void nextTick(() => {
    newTaskTitleInputRef.value?.focus()
  })
}

const selectActiveNewTaskMilestone = (
  options: {
    focusInput?: boolean
    suppressEnter?: boolean
  } = {},
) => {
  const activeOption =
    milestoneOptions.value[newTaskActiveMilestoneIndex.value] ?? milestoneOptions.value[0]
  selectNewTaskMilestone(activeOption?.value ?? null, options)
}

const onNewTaskQuickCreateFocusIn = () => {
  isInputFocused.value = true
}

const onNewTaskQuickCreateFocusOut = (event: FocusEvent) => {
  const nextTarget = event.relatedTarget as Node | null
  if (isWithinNewTaskQuickCreate(nextTarget)) return
  collapseNewTaskQuickCreate()
}

const onNewTaskInputFocus = () => {
  isInputFocused.value = true
}

const onNewTaskInputEnter = () => {
  void addTask()
}

const onNewTaskInputTab = () => {
  shouldOpenNewTaskFlagMenuOnTriggerFocus.value = true
}

const onNewTaskAssigneePickerOpen = () => {
  if (!isTeamProjectContext.value || !canCreateTaskInCurrentContext.value || isAddingTask.value) {
    newTaskAssigneePickerRef.value?.close(false)
    return
  }

  isNewTaskAssigneePickerOpen.value = true
  isNewTaskFlagMenuOpen.value = false
  shouldOpenNewTaskFlagMenuOnTriggerFocus.value = false
  void loadNewTaskAssigneeCandidates()
}

const onNewTaskAssigneePickerClose = () => {
  isNewTaskAssigneePickerOpen.value = false
}

const onNewTaskAssigneePickerRetry = () => {
  if (!isTeamProjectContext.value || !canCreateTaskInCurrentContext.value || isAddingTask.value)
    return
  void retryNewTaskAssigneeCandidates()
}

const onNewTaskFlagTriggerFocus = () => {
  isInputFocused.value = true
  if (!shouldOpenNewTaskFlagMenuOnTriggerFocus.value) return

  shouldOpenNewTaskFlagMenuOnTriggerFocus.value = false
  openNewTaskFlagMenu()
}

const onNewTaskFlagTriggerKeydown = (event: KeyboardEvent) => {
  const { key } = event

  if (key === 'ArrowDown') {
    event.preventDefault()
    if (!isNewTaskFlagMenuOpen.value) {
      openNewTaskFlagMenu()
    }
    moveNewTaskActiveMilestoneIndex(1)
    return
  }

  if (key === 'ArrowUp') {
    event.preventDefault()
    if (!isNewTaskFlagMenuOpen.value) {
      openNewTaskFlagMenu()
    }
    moveNewTaskActiveMilestoneIndex(-1)
    return
  }

  if (key === 'Enter' || key === ' ') {
    event.preventDefault()
    event.stopPropagation()
    if (!isNewTaskFlagMenuOpen.value) {
      openNewTaskFlagMenu()
      return
    }
    selectActiveNewTaskMilestone({ focusInput: true, suppressEnter: true })
    return
  }

  if (key === 'Escape' && isNewTaskFlagMenuOpen.value) {
    event.preventDefault()
    isNewTaskFlagMenuOpen.value = false
    void nextTick(() => {
      newTaskTitleInputRef.value?.focus()
    })
  }
}

const onNewTaskFlagMenuKeydown = (event: KeyboardEvent) => {
  const { key } = event

  if (key === 'ArrowDown') {
    event.preventDefault()
    moveNewTaskActiveMilestoneIndex(1)
    return
  }

  if (key === 'ArrowUp') {
    event.preventDefault()
    moveNewTaskActiveMilestoneIndex(-1)
    return
  }

  if (key === 'Enter' || key === ' ') {
    event.preventDefault()
    event.stopPropagation()
    selectActiveNewTaskMilestone({ focusInput: true, suppressEnter: true })
    return
  }

  if (key === 'Escape') {
    event.preventDefault()
    isNewTaskFlagMenuOpen.value = false
    void nextTick(() => {
      newTaskFlagTriggerRef.value?.focus()
    })
  }
}

const toggleNewTaskFlagMenu = () => {
  shouldOpenNewTaskFlagMenuOnTriggerFocus.value = false
  if (isNewTaskFlagMenuOpen.value) {
    isNewTaskFlagMenuOpen.value = false
    return
  }
  openNewTaskFlagMenu()
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

const handleTaskAssignmentHistoryOutcome = async (
  outcome: Awaited<ReturnType<typeof openTaskAssignmentHistory>>,
  taskId: string | null,
) => {
  if (outcome.kind !== 'error' || !taskId || taskAssignmentHistoryTaskId.value !== taskId) return

  if (outcome.errorKind === 'PERMISSION_DENIED') {
    await loadTasks({ forceRefresh: true })
    if (selectedTask.value?.id === taskId) {
      toast.warning('负责人历史查看权限已发生变化，已刷新最新任务权限。')
    }
    return
  }

  if (outcome.errorKind === 'NOT_FOUND') {
    closeTaskAssignmentHistoryDrawer(false)
    closeDetail()
    await loadTasks({ forceRefresh: true })
    return
  }

  if (outcome.errorKind === 'AUTHENTICATION_REQUIRED') {
    closeTaskAssignmentHistoryDrawer(false)
  }
}

const emitTaskAssignmentChanged = (taskId: string) => {
  taskAssignmentChangedTaskId.value = taskId
  taskAssignmentChangedRevision.value += 1
}

const drainAssignmentHistoryAutoRefresh = async () => {
  if (assignmentHistoryAutoRefreshRunning.value) return

  assignmentHistoryAutoRefreshRunning.value = true
  try {
    while (
      pendingAssignmentHistoryRefreshRevision.value > appliedAssignmentHistoryRefreshRevision.value
    ) {
      const revision = pendingAssignmentHistoryRefreshRevision.value
      const taskId = taskAssignmentChangedTaskId.value

      if (
        !taskId
        || !isTaskAssignmentHistoryDrawerOpen.value
        || taskAssignmentHistoryTaskId.value !== taskId
        || selectedTask.value?.id !== taskId
      ) {
        appliedAssignmentHistoryRefreshRevision.value = revision
        break
      }

      const outcome = await refreshTaskAssignmentHistory()
      if (outcome.kind === 'ignored') {
        // A first-page or load-more request is still running. The busy watcher
        // will drain this revision once that request settles.
        break
      }

      appliedAssignmentHistoryRefreshRevision.value = revision
      await handleTaskAssignmentHistoryOutcome(outcome, taskId)

      // Errors are surfaced by the drawer and must be retried explicitly.
      // A stale response also means the task/context changed underneath us.
      if (outcome.kind === 'error' || outcome.kind === 'stale') break
    }
  } finally {
    assignmentHistoryAutoRefreshRunning.value = false
  }
}

const scheduleAssignmentHistoryAutoRefresh = (
  revision: number,
  taskId: string | null,
) => {
  if (
    !taskId
    || !isTaskAssignmentHistoryDrawerOpen.value
    || taskAssignmentHistoryTaskId.value !== taskId
    || selectedTask.value?.id !== taskId
  ) return

  pendingAssignmentHistoryRefreshRevision.value = Math.max(
    pendingAssignmentHistoryRefreshRevision.value,
    revision,
  )
  void drainAssignmentHistoryAutoRefresh()
}

const closeTaskAssignmentHistoryDrawer = (restoreFocus = true) => {
  const wasOpen = isTaskAssignmentHistoryDrawerOpen.value
  const taskId = taskAssignmentHistoryTaskId.value
  isTaskAssignmentHistoryDrawerOpen.value = false
  resetTaskAssignmentHistory()
  pendingAssignmentHistoryRefreshRevision.value = appliedAssignmentHistoryRefreshRevision.value
  taskAssignmentChangedTaskId.value = null

  if (wasOpen && restoreFocus && taskId && selectedTask.value?.id === taskId) {
    void nextTick(() => taskAssigneeEntryRef.value?.focusHistoryButton())
  }
}

const openTaskAssignmentHistoryDrawer = async () => {
  const task = selectedTask.value
  if (!task || taskAssignmentMutationBusy.value) return

  closeNewTaskQuickCreateMenus()
  closeDueDatePicker()
  isPriorityMenuOpen.value = false
  isMilestoneMenuOpen.value = false
  isTaskAssignmentHistoryDrawerOpen.value = true

  const outcome = await openTaskAssignmentHistory(task.id)
  await handleTaskAssignmentHistoryOutcome(outcome, task.id)
}

const retryTaskAssignmentHistory = async () => {
  const taskId = taskAssignmentHistoryTaskId.value
  if (!taskId) return

  const outcome =
    taskAssignmentHistoryPhase.value === 'load-more-error'
      ? await loadMoreTaskAssignmentHistoryRecords()
      : await refreshTaskAssignmentHistory()
  await handleTaskAssignmentHistoryOutcome(outcome, taskId)
}

const loadMoreTaskAssignmentHistory = async () => {
  const taskId = taskAssignmentHistoryTaskId.value
  if (!taskId) return
  const outcome = await loadMoreTaskAssignmentHistoryRecords()
  await handleTaskAssignmentHistoryOutcome(outcome, taskId)
}

const dismissTaskAssignmentDialog = (restoreFocus = true) => {
  const wasOpen = Boolean(taskAssignmentDraft.value)
  closeTaskAssignmentDraft()
  resetTaskAssignmentCandidates()
  if (wasOpen && restoreFocus) {
    void nextTick(() => taskAssigneeEntryRef.value?.focusChangeButton())
  }
}

const resetTaskAssignmentInteraction = (restoreFocus = true) => {
  resetTaskAssignmentMutation()
  pendingTaskAssignmentRefresh.value = null
  dismissTaskAssignmentDialog(restoreFocus)
}

const closeTaskAssignmentDialog = (restoreFocus = true) => {
  resetTaskAssignmentInteraction(restoreFocus)
}

const openTaskAssignmentDialog = () => {
  if (!selectedTask.value) return
  const currentTask = ensureTaskActionAllowed(selectedTask.value.id, 'assign')
  if (!currentTask) return

  closeNewTaskQuickCreateMenus()
  closeDueDatePicker()
  isPriorityMenuOpen.value = false
  isMilestoneMenuOpen.value = false
  openTaskAssignmentDraft({
    taskId: currentTask.id,
    projectId: currentTask.projectId,
    contextKey: currentContextKey.value,
    currentAssigneeUserId: currentTask.assigneeUserId,
  })
  void loadTaskAssignmentCandidates()
}

const retryTaskAssignmentCandidates = () => {
  if (!taskAssignmentDraft.value) return
  void retryTaskAssignmentCandidateLoad()
}

const getTaskAssignmentSuccessMessage = (operation: TaskAssignmentOperation) => {
  if (operation === 'ASSIGN') return '负责人已分配。'
  if (operation === 'REASSIGN') return '负责人已转派。'
  if (operation === 'UNASSIGN') return '已解除任务负责人。'
  return '负责人已同步。'
}

const getCommittedTaskAssignmentRefreshErrorMessage = (changed: boolean) =>
  changed
    ? '负责人变更已提交，但最新任务状态加载失败，请重新加载后再操作。'
    : '负责人状态已确认，但最新任务状态加载失败，请重新加载后再操作。'

const reconcileCommittedTaskAssignment = async (snapshot: PendingTaskAssignmentRefresh) => {
  const isContextActive = () =>
    isTaskViewMounted.value &&
    isAuthSessionSnapshotActive(snapshot.sessionSnapshot) &&
    snapshot.contextKey === currentContextKey.value

  const isActive = () => isContextActive() && selectedTask.value?.id === snapshot.taskId

  const abandonStaleRefresh = () => {
    completeTaskAssignmentMutation()
    if (pendingTaskAssignmentRefresh.value === snapshot) {
      pendingTaskAssignmentRefresh.value = null
    }
    dismissTaskAssignmentDialog(false)
    return false
  }

  if (!isActive()) return abandonStaleRefresh()

  if (snapshot.result.changed && !snapshot.cacheInvalidated) {
    removeProjectTaskCaches(snapshot.projectId)
    snapshot.cacheInvalidated = true
  }

  const refreshOutcome = await loadTasks({ forceRefresh: true })
  if (!isContextActive()) return abandonStaleRefresh()
  if (selectedTask.value && selectedTask.value.id !== snapshot.taskId) {
    return abandonStaleRefresh()
  }

  const refreshedTask = findTaskById(taskList.value, snapshot.taskId)
  if (
    refreshOutcome.status !== 'ok' ||
    !refreshedTask ||
    refreshedTask.assigneeUserId !== snapshot.result.assigneeUserId
  ) {
    const message = getCommittedTaskAssignmentRefreshErrorMessage(snapshot.result.changed)
    markTaskAssignmentCommittedRefreshError(message)
    failClosedTaskCapabilities(snapshot.taskId)
    toast.warning(message)
    return false
  }

  completeTaskAssignmentMutation()
  if (snapshot.result.changed && !snapshot.changedEventEmitted) {
    snapshot.changedEventEmitted = true
    emitTaskAssignmentChanged(snapshot.taskId)
  }
  if (pendingTaskAssignmentRefresh.value === snapshot) {
    pendingTaskAssignmentRefresh.value = null
  }
  dismissTaskAssignmentDialog()

  if (snapshot.result.changed) {
    toast.success(getTaskAssignmentSuccessMessage(snapshot.operation))
  } else {
    toast.info('负责人未发生变化，已同步最新任务状态。')
  }
  return true
}

const retryCommittedTaskAssignmentRefresh = async () => {
  const snapshot = pendingTaskAssignmentRefresh.value
  if (!snapshot || !beginCommittedTaskAssignmentRefreshRetry()) return
  await reconcileCommittedTaskAssignment(snapshot)
}

const isCurrentTaskAssignmentRecovery = (taskId: string, contextKey: string) =>
  taskAssignmentDraft.value?.taskId === taskId &&
  taskAssignmentDraft.value.contextKey === contextKey &&
  currentContextKey.value === contextKey

const abandonStaleTaskAssignmentRecovery = () => {
  completeTaskAssignmentMutation()
  dismissTaskAssignmentDialog(false)
}

const reconcileFailedTaskAssignment = async (source: TaskAssignmentRecoverySource) => {
  const draft = taskAssignmentDraft.value
  if (!draft) {
    completeTaskAssignmentMutation()
    return false
  }

  const sessionSnapshot = captureAuthSessionSnapshot()
  const taskId = draft.taskId
  const projectId = draft.projectId
  const contextKey = draft.contextKey
  const targetAssigneeUserId = draft.targetAssigneeUserId
  const isActive = () =>
    isAuthSessionSnapshotActive(sessionSnapshot) &&
    isCurrentTaskAssignmentRecovery(taskId, contextKey)

  if (!isActive()) {
    abandonStaleTaskAssignmentRecovery()
    return false
  }

  removeProjectTaskCaches(projectId)
  resetTaskAssignmentCandidates()
  failClosedTaskCapabilities(taskId)

  const refreshOutcome = await loadTasks({ forceRefresh: true })
  if (!isActive()) {
    abandonStaleTaskAssignmentRecovery()
    return false
  }

  if (refreshOutcome.status !== 'ok') {
    markTaskAssignmentRecoveryError('最新负责人状态加载失败，请重新核对后再操作。')
    toast.warning('最新负责人状态暂时无法确认，未再次提交负责人变更。')
    return false
  }

  const refreshedTask = findTaskById(taskList.value, taskId)
  if (!refreshedTask) {
    completeTaskAssignmentMutation()
    dismissTaskAssignmentDialog(false)
    toast.warning('任务已不存在或当前不可访问。')
    return false
  }

  if (!refreshedTask.capabilities.canAssign) {
    completeTaskAssignmentMutation()
    dismissTaskAssignmentDialog(false)
    toast.warning('负责人变更权限已发生变化，已刷新最新任务权限。')
    return false
  }

  rebaseTaskAssignmentExpectedAssignee(refreshedTask.assigneeUserId)
  const candidatesReady = await loadTaskAssignmentCandidates()
  if (!isActive()) {
    abandonStaleTaskAssignmentRecovery()
    return false
  }

  if (!candidatesReady) {
    markTaskAssignmentRecoveryError('最新团队成员加载失败，请重新核对后再操作。')
    toast.warning('最新团队成员暂时无法确认，未再次提交负责人变更。')
    return false
  }

  if (refreshedTask.assigneeUserId === targetAssigneeUserId) {
    completeTaskAssignmentMutation()
    emitTaskAssignmentChanged(taskId)
    dismissTaskAssignmentDialog()
    toast.info(
      source === 'CONFLICT'
        ? '当前负责人已是所选目标，已同步最新状态。'
        : '已核对，当前负责人已是所选目标。',
    )
    return true
  }

  const message =
    source === 'CONFLICT'
      ? '任务负责人已被其他操作修改，请基于最新负责人再次确认。'
      : '已核对最新负责人，请确认后再重新提交。'
  requireTaskAssignmentReconfirmation(message)
  toast.warning(message)
  return true
}

const retryFailedTaskAssignmentRecovery = async () => {
  const source = taskAssignmentRecoverySource.value
  if (!source || !beginTaskAssignmentRecoveryRetry()) return
  await reconcileFailedTaskAssignment(source)
}

const recoverTaskAssignment = async () => {
  if (taskAssignmentMutationPhase.value === 'committed-refresh-error') {
    await retryCommittedTaskAssignmentRefresh()
    return
  }
  await retryFailedTaskAssignmentRecovery()
}

const reconfirmTaskAssignment = async (payload: {
  targetAssigneeUserId: string | null
  reason?: string
}) => {
  if (!beginExplicitTaskAssignmentReconfirm()) return
  await submitTaskAssignment(payload)
}

const submitTaskAssignment = async (payload: {
  targetAssigneeUserId: string | null
  reason?: string
}) => {
  const draft = taskAssignmentDraft.value
  if (!draft) return
  const latestTask = ensureTaskActionAllowed(draft.taskId, 'assign')
  if (!latestTask || latestTask.projectId !== draft.projectId) {
    closeTaskAssignmentDialog(false)
    return
  }
  if (payload.targetAssigneeUserId !== draft.targetAssigneeUserId) {
    toast.warning('负责人草稿已发生变化，请重新确认。')
    return
  }
  if (draft.contextKey !== currentContextKey.value) {
    closeTaskAssignmentDialog(false)
    return
  }
  if (latestTask.assigneeUserId !== draft.expectedAssigneeUserId) {
    beginTaskAssignmentFailureRecovery('CONFLICT')
    await reconcileFailedTaskAssignment('CONFLICT')
    return
  }
  if (taskAssignmentCandidatesStatus.value !== 'ready') {
    toast.warning('负责人列表尚未准备完成，请重新加载。')
    return
  }
  if (
    payload.targetAssigneeUserId !== draft.expectedAssigneeUserId &&
    !isSelectableTaskAssignmentAssignee(payload.targetAssigneeUserId)
  ) {
    toast.warning('负责人列表已发生变化，请重新选择。')
    return
  }

  const reasonResult = normalizeTaskAssignmentReason(draft.reason)
  if (!reasonResult.valid) {
    toast.warning(reasonResult.message)
    return
  }
  if (payload.reason !== reasonResult.value) {
    toast.warning('负责人变更原因已发生变化，请重新确认。')
    return
  }

  const operation = taskAssignmentOperation.value
  const sessionSnapshot = captureAuthSessionSnapshot()
  const outcome = await submitTaskAssignmentMutation({
    taskId: draft.taskId,
    assigneeUserId: draft.targetAssigneeUserId,
    expectedAssigneeUserId: draft.expectedAssigneeUserId,
    ...(reasonResult.value ? { reason: reasonResult.value } : {}),
  })

  if (outcome.kind === 'ignored' || outcome.kind === 'stale') return
  if (
    !isAuthSessionSnapshotActive(sessionSnapshot) ||
    draft.contextKey !== currentContextKey.value
  ) return

  if (outcome.kind === 'error') {
    if (outcome.errorKind === 'PERMISSION_DENIED') {
      await recoverTaskPermissionDenial(draft.taskId)
      if (
        !isAuthSessionSnapshotActive(sessionSnapshot) ||
        draft.contextKey !== currentContextKey.value
      ) return
      closeTaskAssignmentDialog(false)
      toast.warning('负责人变更权限已发生变化，已刷新最新任务权限。')
      return
    }

    if (outcome.errorKind === 'NOT_FOUND') {
      closeTaskAssignmentDialog(false)
      await loadTasks({ forceRefresh: true })
      toast.warning('任务已不存在或当前不可访问。')
      return
    }

    if (outcome.errorKind === 'AUTHENTICATION_REQUIRED') {
      closeTaskAssignmentDialog(false)
      return
    }

    if (outcome.errorKind === 'VALIDATION') {
      toast.warning(taskAssignmentMutationErrorMessage.value || '负责人变更请求不合法。')
      return
    }

    if (
      outcome.errorKind === 'CONFLICT' ||
      outcome.errorKind === 'NETWORK' ||
      outcome.errorKind === 'SERVER' ||
      outcome.errorKind === 'UNKNOWN'
    ) {
      const source: TaskAssignmentRecoverySource =
        outcome.errorKind === 'CONFLICT' ? 'CONFLICT' : 'UNCERTAIN'
      await reconcileFailedTaskAssignment(source)
      return
    }

    toast.warning(taskAssignmentMutationErrorMessage.value || '负责人状态无法确认，请重新核对。')
    return
  }

  pendingTaskAssignmentRefresh.value = {
    taskId: draft.taskId,
    projectId: draft.projectId,
    contextKey: draft.contextKey,
    sessionSnapshot,
    operation,
    result: outcome.result,
    cacheInvalidated: false,
    changedEventEmitted: false,
  }
  await reconcileCommittedTaskAssignment(pendingTaskAssignmentRefresh.value)
}

const closeTaskScopedInteractions = () => {
  closeTaskAssignmentDialog(false)
  closeTaskAssignmentHistoryDrawer(false)
  closeDueDatePicker()
  isPriorityMenuOpen.value = false
  isMilestoneMenuOpen.value = false
  closeCompletionQualityModal()
  showDeleteTaskConfirm.value = false
  pendingDeleteTask.value = null
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

  if (
    isPriorityMenuOpen.value &&
    priorityRowRef.value &&
    !priorityRowRef.value.contains(targetNode)
  ) {
    isPriorityMenuOpen.value = false
  }

  if (
    isDueDatePickerOpen.value &&
    dueDateRowRef.value &&
    !dueDateRowRef.value.contains(targetNode)
  ) {
    closeDueDatePicker()
  }

  if (
    isMilestoneMenuOpen.value &&
    milestoneRowRef.value &&
    !milestoneRowRef.value.contains(targetNode)
  ) {
    isMilestoneMenuOpen.value = false
  }

  if (
    (isInputFocused.value || isNewTaskFlagMenuOpen.value) &&
    !isWithinNewTaskQuickCreate(targetNode)
  ) {
    collapseNewTaskQuickCreate()
  }
}

const selectPriority = async (val: number) => {
  if (!selectedTask.value) return
  const currentTask = ensureTaskActionAllowed(selectedTask.value.id, 'reorganize')
  if (!currentTask) return

  const writeSnapshot = captureTaskWriteSnapshot(`task:${currentTask.id}:priority`, currentTask.id)
  const oldPriority = currentTask.priority
  currentTask.priority = val
  isPriorityMenuOpen.value = false

  try {
    await updateTaskContentApi({ id: currentTask.id, priority: val })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    markListReplanDirty()
    await loadTasks({ forceRefresh: true, contextSnapshot: writeSnapshot.context })
    if (!isTaskWriteSnapshotActive(writeSnapshot, { allowMissingTask: true })) return
  } catch (error) {
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    currentTask.priority = oldPriority
    await handleTaskMutationFailure(
      error,
      currentTask.id,
      '更新优先级失败，请检查网络后重试。',
      writeSnapshot,
    )
  }
}

const updateDueDate = async (nextDate: string | null) => {
  if (!selectedTask.value) return
  const currentTask = ensureTaskActionAllowed(selectedTask.value.id, 'editContent')
  if (!currentTask) return

  const writeSnapshot = captureTaskWriteSnapshot(`task:${currentTask.id}:due-date`, currentTask.id)
  const finalDate = nextDate || null
  const oldDate = currentTask.dueDate
  const oldDateKey = normalizeTaskDueDate(oldDate) || null
  if (oldDateKey === finalDate) {
    isDueDatePickerOpen.value = false
    return
  }

  currentTask.dueDate = finalDate
  isDueDatePickerOpen.value = false

  try {
    await updateTaskContentApi({ id: currentTask.id, dueDate: finalDate })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    markListReplanDirty()
    await loadTasks({ forceRefresh: true, contextSnapshot: writeSnapshot.context })
    if (!isTaskWriteSnapshotActive(writeSnapshot, { allowMissingTask: true })) return
  } catch (error) {
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    currentTask.dueDate = oldDate
    await handleTaskMutationFailure(
      error,
      currentTask.id,
      '更新日期失败，请检查网络后重试。',
      writeSnapshot,
    )
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
  const currentTask = ensureTaskActionAllowed(selectedTask.value.id, 'reorganize')
  if (!currentTask) return

  const writeSnapshot = captureTaskWriteSnapshot(`task:${currentTask.id}:milestone`, currentTask.id)
  const finalMilestoneId = milestoneId && milestoneId !== '0' ? milestoneId : null
  const oldMilestoneId = currentTask.milestoneId
  if ((oldMilestoneId ?? null) === finalMilestoneId) {
    isMilestoneMenuOpen.value = false
    return
  }
  currentTask.milestoneId = finalMilestoneId
  isMilestoneMenuOpen.value = false

  try {
    await updateTaskContentApi({ id: currentTask.id, milestoneId: finalMilestoneId })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    await loadTasks({ forceRefresh: true, contextSnapshot: writeSnapshot.context })
    if (!isTaskWriteSnapshotActive(writeSnapshot, { allowMissingTask: true })) return
  } catch (error) {
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    currentTask.milestoneId = oldMilestoneId
    await handleTaskMutationFailure(
      error,
      currentTask.id,
      '更新所属阶段失败，请检查网络后重试。',
      writeSnapshot,
    )
  }
}

const onTextBlur = async () => {
  if (!selectedTask.value) return
  const currentTask = ensureTaskActionAllowed(selectedTask.value.id, 'editContent')
  if (!currentTask) {
    selectedTask.value.title = selectedTaskTitleBaseline.value
    selectedTask.value.description = selectedTaskDescriptionBaseline.value
    return
  }

  const writeSnapshot = captureTaskWriteSnapshot(`task:${currentTask.id}:content`, currentTask.id)
  const previousTitle = selectedTaskTitleBaseline.value
  try {
    await updateTaskContentApi({
      id: currentTask.id,
      title: currentTask.title,
      description: currentTask.description ?? undefined,
    })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    if (currentTask.title !== previousTitle) {
      markListReplanDirty()
    }
    selectedTaskTitleBaseline.value = currentTask.title
    selectedTaskDescriptionBaseline.value = currentTask.description
    await loadTasks({ forceRefresh: true, contextSnapshot: writeSnapshot.context })
    if (!isTaskWriteSnapshotActive(writeSnapshot, { allowMissingTask: true })) return
  } catch (error) {
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    console.error('保存任务失败', error)
    await handleTaskMutationFailure(
      error,
      currentTask.id,
      '保存失败，请检查网络后重试。',
      writeSnapshot,
    )
  }
}

const requestDeleteTask = () => {
  if (!selectedTask.value) return
  const currentTask = ensureTaskActionAllowed(selectedTask.value.id, 'delete')
  if (!currentTask) return
  pendingDeleteTask.value = { ...currentTask }
  showDeleteTaskConfirm.value = true
}

const confirmDeleteTask = async () => {
  const pendingTask = pendingDeleteTask.value
  if (!pendingTask) return

  const latestTask = ensureTaskActionAllowed(pendingTask.id, 'delete')
  if (!latestTask) {
    showDeleteTaskConfirm.value = false
    return
  }
  const taskToDelete = { ...latestTask }
  const writeSnapshot = captureTaskWriteSnapshot(`task:${taskToDelete.id}:delete`, taskToDelete.id)

  showDeleteTaskConfirm.value = false

  const originalIndex = taskList.value.findIndex((task) => task.id === taskToDelete.id)
  taskList.value = taskList.value.filter((task) => task.id !== taskToDelete.id)
  if (canUsePersistentProjectTaskCache.value) {
    removeTaskFromCaches(taskToDelete)
  }
  selectedTask.value = null

  undoDelete.scheduleUndoDelete({
    label: `任务「${taskToDelete.title}」`,
    pendingMessage: `任务「${taskToDelete.title}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteTaskApi(taskToDelete.id)
    },
    onCommitSuccess: async () => {
      if (!isTaskWriteSnapshotActive(writeSnapshot, { allowMissingTask: true })) return
      markListReplanDirty()
      await loadTasks({ forceRefresh: true, contextSnapshot: writeSnapshot.context })
    },
    onRollback: async () => {
      if (!isTaskWriteSnapshotActive(writeSnapshot, { allowMissingTask: true })) return
      if (!taskList.value.some((task) => task.id === taskToDelete.id)) {
        const nextTasks = [...taskList.value]
        const insertIndex =
          originalIndex >= 0 && originalIndex <= nextTasks.length ? originalIndex : nextTasks.length
        nextTasks.splice(insertIndex, 0, taskToDelete)
        taskList.value = nextTasks
      }
      if (canUsePersistentProjectTaskCache.value) {
        upsertTaskInCaches(taskToDelete)
      }
    },
    onCommitError: async (error) => {
      if (!isTaskWriteSnapshotActive(writeSnapshot, { allowMissingTask: true })) return
      if (classifyApiError(error) !== 'PERMISSION_DENIED') return
      await recoverTaskPermissionDenial(
        taskToDelete.id,
        writeSnapshot,
        { allowMissingTask: true },
      )
      return '删除权限已发生变化，已恢复任务并刷新最新权限。'
    },
  })
}

const submitNewMilestone = async () => {
  const name = newMilestoneName.value.trim()
  const projectId = selectedProjectId.value
  if (!name || !projectId) {
    isAddingMilestone.value = false
    return
  }

  const writeSnapshot = captureTaskWriteSnapshot(`milestone:create:${projectId}`)
  try {
    await addMilestoneApi({
      name,
      projectId,
      orderNo: milestoneList.value.length,
    })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    newMilestoneName.value = ''
    isAddingMilestone.value = false
    await loadMilestones({ forceRefresh: true, contextSnapshot: writeSnapshot.context })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
  } catch {
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    toast.error('创建阶段失败，请检查网络后重试。')
  }
}

const openAddMilestoneInput = () => {
  isAddingMilestone.value = true
  newMilestoneName.value = ''
}

const resetMilestoneInteraction = () => {
  isAddingMilestone.value = false
  newMilestoneName.value = ''
  editingMilestoneId.value = ''
  editMilestoneName.value = ''
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

  const writeSnapshot = captureTaskWriteSnapshot(
    `milestone:${milestone.id}:rename`,
  )
  try {
    await updateMilestoneApi({ ...milestone, name: newName })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
    editingMilestoneId.value = ''
    await loadMilestones({ forceRefresh: true, contextSnapshot: writeSnapshot.context })
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
  } catch {
    if (!isTaskWriteSnapshotActive(writeSnapshot)) return
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
  const writeSnapshot = captureTaskWriteSnapshot(`milestone:${id}:delete`)
  milestoneList.value = snapshot.filter((milestone) => milestone.id !== id)

  undoDelete.scheduleUndoDelete({
    label: `阶段「${name}」`,
    pendingMessage: `阶段「${name}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteMilestoneApi(id)
    },
    onCommitSuccess: async () => {
      if (!isTaskWriteSnapshotActive(writeSnapshot)) return
      await Promise.all([
        loadMilestones({ forceRefresh: true, contextSnapshot: writeSnapshot.context }),
        loadTasks({ forceRefresh: true, contextSnapshot: writeSnapshot.context }),
      ])
    },
    onRollback: () => {
      if (!isTaskWriteSnapshotActive(writeSnapshot)) return
      if (!milestoneList.value.some((milestone) => milestone.id === id)) {
        const next = [...milestoneList.value]
        const insertIndex =
          removedIndex >= 0 && removedIndex <= next.length ? removedIndex : next.length
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
      unassigned: sortTaskListForCurrentBoard(taskList.value),
      milestones: [] as { milestone: Milestone; tasks: TaskModel[]; progress: number }[],
    }
  }

  const result = {
    unassigned: [] as TaskModel[],
    milestones: [] as { milestone: Milestone; tasks: TaskModel[]; progress: number }[],
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

  result.milestones.sort((a, b) => {
    const aAllCompleted = isMilestoneGroupAllCompleted(a)
    const bAllCompleted = isMilestoneGroupAllCompleted(b)
    if (aAllCompleted !== bAllCompleted) {
      return aAllCompleted ? 1 : -1
    }
    return (a.milestone.orderNo || 0) - (b.milestone.orderNo || 0)
  })

  return result
})

watch(newTaskAssigneeStatus, (status) => {
  if (!isTeamProjectContext.value || newTaskAssigneeUserId.value === null) return

  if (
    status === 'error' ||
    status === 'unavailable' ||
    (status === 'ready' && !isSelectableNewTaskAssignee(newTaskAssigneeUserId.value))
  ) {
    newTaskAssigneeUserId.value = null
  }
})

watch(taskAssignmentCandidatesStatus, (status) => {
  const draft = taskAssignmentDraft.value
  if (!draft || status !== 'ready') return
  if (
    draft.targetAssigneeUserId !== draft.expectedAssigneeUserId &&
    !isSelectableTaskAssignmentAssignee(draft.targetAssigneeUserId)
  ) {
    if (taskAssignmentRecoveryActive.value) {
      toast.warning('原目标负责人已不在最新成员列表中，请重新选择。')
      return
    }
    setTaskAssignmentTarget(draft.expectedAssigneeUserId)
    toast.warning('负责人列表已发生变化，请重新选择。')
  }
})

watch(
  [currentContextKey, () => selectedTask.value?.id ?? null],
  ([contextKey, taskId]) => {
    const pendingRefresh = pendingTaskAssignmentRefresh.value
    if (
      (pendingRefresh?.contextKey === contextKey ||
        (taskAssignmentRecoveryActive.value &&
          taskAssignmentDraft.value?.contextKey === contextKey)) &&
      taskId === null
    ) {
      return
    }
    if (invalidateTaskAssignmentDraft(contextKey, taskId)) {
      resetTaskAssignmentCandidates()
      if (!taskAssignmentMutationBusy.value) {
        resetTaskAssignmentMutation()
        pendingTaskAssignmentRefresh.value = null
      }
    }
  },
  { flush: 'sync' },
)

watch(
  () => collaborationStore.currentUser?.id,
  (currentActorId, previousActorId) => {
    if (previousActorId !== undefined && currentActorId !== previousActorId) {
      resetNewTaskDraft({ blurInput: true })
      closeTaskAssignmentDialog(false)
      closeTaskAssignmentHistoryDrawer(false)
      resetAllTaskStatusMutations()
    }
  },
)

watch(canCreateTaskInCurrentContext, (allowed, wasAllowed) => {
  if (wasAllowed && !allowed) resetNewTaskDraft({ blurInput: true })
})

watch(
  [() => route.query.teamId, () => route.query.projectId, () => route.query.view],
  async (
    [nextTeamIdRaw, nextProjectIdRaw, nextViewRaw],
    [prevTeamIdRaw, prevProjectIdRaw, prevViewRaw],
  ) => {
    const prevTeamId = typeof prevTeamIdRaw === 'string' ? prevTeamIdRaw : ''
    const nextTeamId = typeof nextTeamIdRaw === 'string' ? nextTeamIdRaw : ''
    const prevProjectId = typeof prevProjectIdRaw === 'string' ? prevProjectIdRaw : ''
    const nextProjectId = typeof nextProjectIdRaw === 'string' ? nextProjectIdRaw : ''
    const prevView = typeof prevViewRaw === 'string' ? prevViewRaw : 'project'
    const nextView = typeof nextViewRaw === 'string' ? nextViewRaw : 'project'
    const preserveDirty =
      prevView === 'project' &&
      nextView === 'project' &&
      prevTeamId === nextTeamId &&
      prevProjectId === nextProjectId &&
      prevProjectId !== ''
    const previousListId = prevProjectId || selectedProjectId.value

    closeCompletionQualityModal()
    closeTodayAiReasonDialog()
    closeListReplanPreviewDialog()
    resetNewTaskDraft({ blurInput: true })
    closeTaskAssignmentHistoryDrawer(false)
    resetAllTaskStatusMutations()

    if (previousListId && !prevTeamId) {
      clearListReplanPreviewState({
        persistListId: previousListId,
        keepDirty: true,
      })
    } else {
      resetListReplanRuntimeState()
    }

    syncSelectedProject()
    closeDueDatePicker()
    selectedTask.value = null
    isPriorityMenuOpen.value = false
    isMilestoneMenuOpen.value = false
    isNewTaskMilestoneMenuOpen.value = false

    if (isTeamProjectContext.value) {
      isListReplanDirty.value = false
      resetListReplanRuntimeState()
    } else if (preserveDirty && !isAggregateView.value && selectedProjectId.value) {
      persistCurrentListReplanState()
    } else if (isAggregateView.value || !selectedProjectId.value) {
      isListReplanDirty.value = false
    } else {
      isListReplanDirty.value = hydrateListReplanDirtyForList(selectedProjectId.value)
      persistCurrentListReplanState()
    }

    if (isTodayView.value) {
      hydrateTodayAiOrderMetaFromCache()
    }
    await loadContextData(currentContextKey.value)
    consumePendingListReplanPreview()
  },
)

watch(
  () => selectedTask.value?.id,
  async () => {
    selectedTaskTitleBaseline.value = selectedTask.value?.title || ''
    selectedTaskDescriptionBaseline.value = selectedTask.value?.description ?? null
    await nextTick()
    syncDetailEditorHeights()
  },
)

watch(taskAssignmentChangedRevision, (revision) => {
  scheduleAssignmentHistoryAutoRefresh(revision, taskAssignmentChangedTaskId.value)
})

watch(taskAssignmentHistoryBusy, (busy) => {
  if (!busy) void drainAssignmentHistoryAutoRefresh()
})

watch(
  () => {
    const task = selectedTask.value
    if (!task) return null
    return {
      id: task.id,
      canEditContent: task.capabilities.canEditContent,
      canChangeStatus: task.capabilities.canChangeStatus,
      canReorganize: task.capabilities.canReorganize,
      canAssign: task.capabilities.canAssign,
      canDelete: task.capabilities.canDelete,
    }
  },
  (next, previous) => {
    if (!next && (pendingTaskAssignmentRefresh.value || taskAssignmentRecoveryActive.value)) {
      return
    }
    if (!next || !previous || next.id !== previous.id) {
      closeTaskScopedInteractions()
      return
    }

    if (previous.canEditContent && !next.canEditContent) {
      closeDueDatePicker()
    }
    if (previous.canChangeStatus && !next.canChangeStatus) {
      closeCompletionQualityModal()
    }
    if (previous.canReorganize && !next.canReorganize) {
      isPriorityMenuOpen.value = false
      isMilestoneMenuOpen.value = false
    }
    if (previous.canAssign && !next.canAssign) {
      if (!pendingTaskAssignmentRefresh.value && !taskAssignmentRecoveryActive.value) {
        closeTaskAssignmentDialog(false)
      }
    }
    if (previous.canDelete && !next.canDelete) {
      showDeleteTaskConfirm.value = false
      pendingDeleteTask.value = null
    }
  },
)

watch([() => todayAiOrderEntry.value.status, isTodayView, () => taskList.value.length], () => {
  consumePendingTodayAiOrder()
})

watch(
  [() => listReplanPreviewEntry.value.status, isAggregateView, () => selectedProjectId.value],
  () => {
    consumePendingListReplanPreview()
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

const resetTaskPageForSession = () => {
  projectLoadVersion.value += 1
  taskLoadVersion.value += 1
  milestoneLoadVersion.value += 1
  taskWriteRevisions.clear()
  isAddingTask.value = false
  isAddingMilestone.value = false
  projectList.value = []
  taskList.value = []
  milestoneList.value = []
  milestoneCacheByProject.value = {}
  selectedTask.value = null
  selectedTaskTitleBaseline.value = ''
  selectedTaskDescriptionBaseline.value = null
  todayAiOrderMetaByTaskId.value = {}
  isListReplanDirty.value = false
  resetListReplanRuntimeState()
  lastListReplanReminderRequestId.value = 0
  closeTodayAiReasonDialog()
  closeListReplanPreviewDialog()
  closeCompletionQualityModal()
  showDeleteTaskConfirm.value = false
  pendingDeleteTask.value = null
  showDeleteMilestoneConfirm.value = false
  pendingDeleteMilestone.value = null
  resetNewTaskDraft({ blurInput: false })
  resetMilestoneInteraction()
  isPriorityMenuOpen.value = false
  isDueDatePickerOpen.value = false
  isMilestoneMenuOpen.value = false
  isNewTaskMilestoneMenuOpen.value = false
  isNewTaskFlagMenuOpen.value = false
  clearBoardSlowTimer()
  displayPhase.value = 'loading'
  boardErrorMessage.value = DEFAULT_BOARD_ERROR_MESSAGE
  closeTaskAssignmentDialog(false)
  closeTaskAssignmentHistoryDrawer(false)
  resetTaskAssignmentCandidates()
  resetAllTaskStatusMutations()
}

useSessionResetHandler(resetTaskPageForSession)

onMounted(async () => {
  isTaskViewMounted.value = true
  if (isTodayView.value) {
    hydrateTodayAiOrderMetaFromCache()
  }
  updateViewport()
  document.addEventListener('keydown', handleCompletionQualityShortcutKeydown)
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('resize', updateViewport)
  onProjectListUpdated(handleProjectListUpdated)
  syncSelectedProject()
  if (!isAggregateView.value && !isTeamProjectContext.value && selectedProjectId.value) {
    hydrateListReplanStateForList(selectedProjectId.value)
  } else {
    isListReplanDirty.value = false
    resetListReplanRuntimeState()
  }
  await loadContextData(currentContextKey.value)
  consumePendingTodayAiOrder()
  consumePendingListReplanPreview()
})

onBeforeUnmount(() => {
  taskWriteRevisions.clear()
  resetAllTaskStatusMutations()
  isTaskViewMounted.value = false
  closeTodayAiReasonDialog()
  closeListReplanPreviewDialog()
  closeCompletionQualityModal()
  closeTaskAssignmentDialog(false)
  closeTaskAssignmentHistoryDrawer(false)
  if (!isAggregateView.value && !isTeamProjectContext.value && selectedProjectId.value) {
    if (isListReplanOperationExpired(pendingListReplanOperation.value)) {
      clearListReplanPreviewState({
        persistListId: selectedProjectId.value,
        keepDirty: true,
      })
    } else {
      persistCurrentListReplanState()
    }
  }
  resetListReplanRuntimeState()
  clearBoardSlowTimer()
  document.removeEventListener('keydown', handleCompletionQualityShortcutKeydown)
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

.ai-reason-header {
  background: var(--color-ai);
}

.list-replan-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-replan-field-label {
  flex-shrink: 0;
  width: 52px;
  color: var(--color-text-tertiary);
}

.list-replan-field-change {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.list-replan-chip,
.list-replan-priority-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-input-border);
  background: var(--color-bg-surface-muted);
  border-radius: 9999px;
  padding: 2px 8px;
  line-height: 1.25;
}

.list-replan-chip {
  color: var(--color-text-body);
}

.list-replan-priority-chip--urgent {
  background: var(--color-danger-soft);
  border-color: var(--color-danger);
}

.list-replan-priority-chip--high {
  background: var(--color-warning-soft);
  border-color: var(--color-warning);
}

.list-replan-priority-chip--low {
  background: var(--color-success-soft);
  border-color: var(--color-success);
}

.list-replan-priority-chip--none {
  background: var(--color-primary-soft-2);
  border-color: var(--color-primary);
}

.list-replan-arrow {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
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
