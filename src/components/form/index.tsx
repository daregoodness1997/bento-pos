import type { ChangeEvent, ReactNode } from 'react';
import { Switch } from '@nextui-org/react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import {
  AppCheckbox,
  AppDatePicker,
  AppSelect,
  type AppSelectOption,
} from '../ui';

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  isDisabled?: boolean;
}

export type FormSelectProps<T extends FieldValues> = BaseFieldProps<T> & {
  isRequired?: boolean;
  options: AppSelectOption[];
  placeholder?: string;
};

export const FormSelect = <T extends FieldValues>({
  control,
  isDisabled,
  isRequired,
  label,
  name,
  options,
  placeholder,
}: FormSelectProps<T>) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <AppSelect
        aria-label={label}
        isDisabled={isDisabled}
        isRequired={isRequired}
        onValueChange={field.onChange}
        options={options}
        placeholder={placeholder}
        value={typeof field.value === 'string' ? field.value : ''}
      />
    )}
  />
);

export type FormDatePickerProps<T extends FieldValues> = BaseFieldProps<T> & {
  isRequired?: boolean;
};

export const FormDatePicker = <T extends FieldValues>({
  control,
  isDisabled,
  isRequired,
  label,
  name,
}: FormDatePickerProps<T>) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <AppDatePicker
        aria-label={label}
        isDisabled={isDisabled}
        isRequired={isRequired}
        onValueChange={field.onChange}
        value={typeof field.value === 'string' ? field.value : ''}
      />
    )}
  />
);

export type FormCheckboxProps<T extends FieldValues> = BaseFieldProps<T> & {
  children: ReactNode;
};

export const FormCheckbox = <T extends FieldValues>({
  children,
  control,
  isDisabled,
  label,
  name,
}: FormCheckboxProps<T>) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <AppCheckbox
        aria-label={label}
        isDisabled={isDisabled}
        isSelected={Boolean(field.value)}
        onValueChange={field.onChange}
      >
        {children}
      </AppCheckbox>
    )}
  />
);

export type FormSwitchProps<T extends FieldValues> = BaseFieldProps<T> & {
  children?: ReactNode;
};

export const FormSwitch = <T extends FieldValues>({
  children,
  control,
  isDisabled,
  label,
  name,
}: FormSwitchProps<T>) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <Switch
        aria-label={label}
        isDisabled={isDisabled}
        isSelected={Boolean(field.value)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          field.onChange(event.target.checked)
        }
      >
        {children}
      </Switch>
    )}
  />
);
