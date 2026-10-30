import type { PracticeChallenge } from '@/service/practice'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import ChallengeForm from '@/pages/practice/components/ChallengeForm.vue'
import { createChallengeAPI, updateChallengeAPI } from '@/service/practice'

vi.mock('@/service/practice', () => ({
  createChallengeAPI: vi.fn(),
  updateChallengeAPI: vi.fn(),
}))

const PopupStub = defineComponent({
  props: { modelValue: Boolean },
  template: '<div v-if="modelValue" data-test="popup"><slot /></div>',
})

const FormStub = defineComponent({
  props: {
    model: { type: Object, required: true },
    rules: { type: Object, required: true },
  },
  setup(_, { expose }) {
    expose({ validate: vi.fn().mockResolvedValue({ valid: true }) })
  },
  template: '<form><slot /></form>',
})

const InputStub = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template: '<input data-test="title" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
})

const DatePickerStub = defineComponent({
  props: {
    modelValue: { type: Number, default: 0 },
    minDate: { type: Number, default: undefined },
    label: { type: String, default: '' },
  },
  template: '<div data-test="date-picker" :data-label="label" />',
})

const TextareaStub = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template: '<textarea data-test="description" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
})

const challenge: PracticeChallenge = {
  id: 'challenge-1',
  title: '原挑战',
  description: '原说明',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  participantCount: 2,
  isJoined: true,
  creator: { id: 'creator-1', name: '创建者' },
}

function mountForm(props: { challenge?: PracticeChallenge } = {}) {
  return mount(ChallengeForm, {
    props: { show: true, ...props },
    global: {
      stubs: {
        'wd-popup': PopupStub,
        'wd-form': FormStub,
        'wd-cell-group': { template: '<div><slot /></div>' },
        'wd-input': InputStub,
        'wd-datetime-picker': DatePickerStub,
        'wd-textarea': TextareaStub,
        'wd-button': ButtonStub,
        'wd-icon': true,
      },
    },
  })
}

describe('challengeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createChallengeAPI).mockResolvedValue(challenge)
    vi.mocked(updateChallengeAPI).mockResolvedValue({ success: true })
  })

  it('编辑模式回填挑战并允许过去的开始日期', () => {
    const wrapper = mountForm({ challenge })

    expect(wrapper.text()).toContain('编辑挑战')
    expect(wrapper.text()).toContain('保存修改')
    expect(wrapper.text()).not.toContain('榜单将按新周期重新统计')
    expect((wrapper.find('[data-test="title"]').element as HTMLInputElement).value).toBe('原挑战')
    expect((wrapper.find('[data-test="description"]').element as HTMLTextAreaElement).value).toBe('原说明')
    expect(wrapper.findComponent(DatePickerStub).props('minDate')).toBeUndefined()
  })

  it('编辑保存调用更新接口并支持清空说明', async () => {
    const wrapper = mountForm({ challenge })
    await wrapper.find('[data-test="description"]').setValue('')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(updateChallengeAPI).toHaveBeenCalledWith('challenge-1', {
      title: '原挑战',
      description: '',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    })
    expect(createChallengeAPI).not.toHaveBeenCalled()
    expect(wrapper.emitted('success')).toHaveLength(1)
    expect(uni.showToast).toHaveBeenCalledWith({ title: '保存成功', icon: 'success' })
  })

  it('允许超过一年的挑战日期范围', () => {
    const wrapper = mountForm({
      challenge: { ...challenge, endDate: '2027-02-01' },
    })
    const form = wrapper.findComponent(FormStub)
    const model = form.props('model') as { endDate: number }
    const rules = form.props('rules') as Record<string, Array<{ validator?: (value: number) => boolean }>>

    const isValid = rules.endDate.every(rule => !rule.validator || rule.validator(model.endDate))

    expect(isValid).toBe(true)
  })

  it('创建模式仍调用创建接口', async () => {
    const wrapper = mountForm()
    await wrapper.find('[data-test="title"]').setValue('新挑战')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(createChallengeAPI).toHaveBeenCalledWith(expect.objectContaining({ title: '新挑战' }))
    expect(updateChallengeAPI).not.toHaveBeenCalled()
  })
})
