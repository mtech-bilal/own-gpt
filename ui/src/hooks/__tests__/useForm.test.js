import { renderHook, act } from '@testing-library/react-hooks';
import * as Yup from 'yup';
import { useForm } from '../useForm';

describe('useForm', () => {
  const initialValues = {
    username: '',
    email: '',
    password: '',
  };

  const validationSchema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  const mockSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useForm(initialValues, validationSchema, mockSubmit)
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle input changes', () => {
    const { result } = renderHook(() =>
      useForm(initialValues, validationSchema, mockSubmit)
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'username', value: 'testuser' },
      });
    });

    expect(result.current.values.username).toBe('testuser');
  });

  it('should validate on blur', async () => {
    const { result } = renderHook(() =>
      useForm(initialValues, validationSchema, mockSubmit)
    );

    // Trigger blur without entering a value
    await act(async () => {
      result.current.handleBlur({
        target: { name: 'email' },
      });
    });

    expect(result.current.errors.email).toBe('Email is required');
    expect(result.current.touched.email).toBe(true);
  });

  it('should validate on submit', async () => {
    const { result } = renderHook(() =>
      useForm(initialValues, validationSchema, mockSubmit)
    );

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn(),
      });
    });

    expect(result.current.errors.username).toBe('Username is required');
    expect(result.current.errors.email).toBe('Email is required');
    expect(result.current.errors.password).toBe('Password is required');
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit when form is valid', async () => {
    const validValues = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    const { result } = renderHook(() =>
      useForm(validValues, validationSchema, mockSubmit)
    );

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn(),
      });
    });

    expect(mockSubmit).toHaveBeenCalledWith(validValues);
  });

  it('should handle setFieldValue', () => {
    const { result } = renderHook(() =>
      useForm(initialValues, validationSchema, mockSubmit)
    );

    act(() => {
      result.current.setFieldValue('username', 'newuser');
    });

    expect(result.current.values.username).toBe('newuser');
  });

  it('should handle setFieldTouched', () => {
    const { result } = renderHook(() =>
      useForm(initialValues, validationSchema, mockSubmit)
    );

    act(() => {
      result.current.setFieldTouched('email', true);
    });

    expect(result.current.touched.email).toBe(true);
  });

  it('should handle resetForm', () => {
    const { result } = renderHook(() =>
      useForm(initialValues, validationSchema, mockSubmit)
    );

    // Change some values
    act(() => {
      result.current.setFieldValue('username', 'testuser');
      result.current.setFieldTouched('username', true);
    });

    // Reset form
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.touched).toEqual({});
    expect(result.current.errors).toEqual({});
  });

  it('should handle submit errors', async () => {
    const errorMessage = 'Submission failed';
    const failingSubmit = jest.fn().mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useForm(
        {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        },
        validationSchema,
        failingSubmit
      )
    );

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn(),
      });
    });

    expect(result.current.submitError).toBe(errorMessage);
    expect(result.current.isSubmitting).toBe(false);
  });
});
