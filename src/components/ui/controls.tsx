import type { ComponentProps, ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import { parseDate } from '@internationalized/date';
import {
  Checkbox,
  DatePicker,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@nextui-org/react';

const inputClassNames = {
  base: 'w-full',
  inputWrapper:
    'h-11 min-h-11 rounded-xl border-default-200/70 bg-content1 shadow-none transition-colors data-[hover=true]:border-default-400 group-data-[focus=true]:border-primary group-data-[focus=true]:bg-content1',
  input:
    'bg-transparent text-[13px] text-foreground placeholder:text-default-500',
  label: 'text-[12px] font-medium text-default-500',
  description: 'text-[11px] text-default-500',
  errorMessage: 'text-[11px] text-danger',
};

const selectClassNames = {
  base: 'w-full',
  trigger:
    'h-11 min-h-11 rounded-xl border-default-200/70 bg-content1 shadow-none transition-colors data-[hover=true]:border-default-400 data-[open=true]:border-primary',
  selectorButton: 'text-default-500',
  value: 'text-[13px] text-foreground',
  placeholder: 'text-[13px] text-default-500',
  popoverContent:
    'rounded-xl border border-default-200 bg-content1 p-1 shadow-2xl',
  listbox: 'max-h-72',
  item: 'rounded-lg text-[13px]',
  label: 'text-[12px] font-medium text-default-500',
  description: 'text-[11px] text-default-500',
};

const dateClassNames = {
  ...inputClassNames,
  selectorButton: 'text-default-500 hover:text-primary',
  selectorIcon: 'text-default-500',
  segment: 'text-[13px]',
  calendar: 'bg-content1',
  popoverContent:
    'rounded-2xl border border-default-200 bg-content1 p-2 shadow-2xl',
};

const textareaClassNames = {
  base: 'w-full',
  inputWrapper:
    'min-h-[92px] rounded-xl border-default-200/70 bg-content1 px-3 py-2 shadow-none transition-colors data-[hover=true]:border-default-400 group-data-[focus=true]:border-primary group-data-[focus=true]:bg-content1',
  input:
    'bg-transparent text-[13px] leading-6 text-foreground placeholder:text-default-500',
  label: 'text-[12px] font-medium text-default-500',
  description: 'text-[11px] text-default-500',
};

const checkboxClassNames = {
  base: 'max-w-fit',
  wrapper: 'rounded-md border-default-400',
  label: 'text-[13px] text-foreground',
};

export const AppInput = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<typeof Input>
>(({ classNames, ...props }, ref) => (
  <Input
    ref={ref}
    radius="lg"
    size="sm"
    variant="bordered"
    validationBehavior="native"
    classNames={{ ...inputClassNames, ...classNames }}
    {...props}
  />
));
AppInput.displayName = 'AppInput';

export const AppTextarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<typeof Textarea>
>(({ classNames, ...props }, ref) => (
  <Textarea
    ref={ref}
    radius="lg"
    size="sm"
    variant="bordered"
    validationBehavior="native"
    classNames={{ ...textareaClassNames, ...classNames }}
    {...props}
  />
));
AppTextarea.displayName = 'AppTextarea';

export interface AppSelectOption {
  key: string;
  label: string;
}

type AppSelectProps = Omit<
  ComponentProps<typeof Select>,
  'children' | 'selectedKeys' | 'onSelectionChange'
> & {
  options: AppSelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
};

export const AppSelect = ({
  classNames,
  onValueChange,
  options,
  value,
  ...props
}: AppSelectProps) => (
  <Select
    radius="lg"
    size="sm"
    variant="bordered"
    selectionMode="single"
    validationBehavior="native"
    selectedKeys={value ? [value] : []}
    classNames={{ ...selectClassNames, ...classNames }}
    onSelectionChange={(keys) => {
      const [selected] = Array.from(keys);
      if (selected !== undefined) {
        onValueChange?.(String(selected));
      }
    }}
    {...props}
  >
    {options.map((option) => (
      <SelectItem key={option.key} value={option.key}>
        {option.label}
      </SelectItem>
    ))}
  </Select>
);

type DatePickerValue = NonNullable<ComponentProps<typeof DatePicker>['value']>;

const toDateValue = (value?: string): DatePickerValue | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  try {
    return parseDate(value) as DatePickerValue;
  } catch {
    return null;
  }
};

type AppDatePickerProps = Omit<
  ComponentProps<typeof DatePicker>,
  'value' | 'onChange'
> & {
  value?: string;
  onValueChange: (value: string) => void;
};

export const AppDatePicker = ({
  classNames,
  onValueChange,
  value,
  ...props
}: AppDatePickerProps) => (
  <DatePicker
    radius="lg"
    size="sm"
    variant="bordered"
    validationBehavior="native"
    value={toDateValue(value)}
    classNames={{ ...dateClassNames, ...classNames }}
    onChange={(date) => onValueChange(date ? date.toString() : '')}
    {...props}
  />
);

export const AppCheckbox = ({
  classNames,
  ...props
}: ComponentProps<typeof Checkbox>) => (
  <Checkbox
    color="primary"
    size="sm"
    classNames={{ ...checkboxClassNames, ...classNames }}
    {...props}
  />
);
