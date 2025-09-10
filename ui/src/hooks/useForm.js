import { useState, useCallback } from 'react';
import * as Yup from 'yup';

const useForm = (initialValues, validationSchema, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const validateField = useCallback(
    async (fieldName, value) => {
      if (!validationSchema) return;

      try {
        await validationSchema.validateAt(fieldName, { [fieldName]: value });
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: error.message,
        }));
      }
    },
    [validationSchema]
  );

  const handleChange = useCallback(
    (event) => {
      const { name, value, type, checked } = event.target;
      const newValue = type === 'checkbox' ? checked : value;

      setValues((prev) => ({
        ...prev,
        [name]: newValue,
      }));

      if (touched[name]) {
        validateField(name, newValue);
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (event) => {
      const { name, value } = event.target;
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));
      validateField(name, value);
    },
    [validateField]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setSubmitError(null);

      // Mark all fields as touched to show validation errors
      const touchedFields = {};
      Object.keys(values).forEach((key) => {
        touchedFields[key] = true;
      });
      setTouched(touchedFields);

      // Validate all fields
      if (validationSchema) {
        try {
          await validationSchema.validate(values, { abortEarly: false });
        } catch (validationErrors) {
          const newErrors = {};
          validationErrors.inner.forEach((error) => {
            newErrors[error.path] = error.message;
          });
          setErrors(newErrors);
          return;
        }
      }

      // Submit the form
      try {
        setIsSubmitting(true);
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
        setSubmitError(error.message || 'An error occurred while submitting the form');
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validationSchema, onSubmit]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
  }, [initialValues]);

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [name]: isTouched,
    }));
  }, []);

  const getFieldProps = useCallback(
    (name) => ({
      name,
      value: values[name] ?? '',
      onChange: handleChange,
      onBlur: handleBlur,
      error: Boolean(touched[name] && errors[name]),
      helperText: touched[name] && errors[name],
    }),
    [values, touched, errors, handleChange, handleBlur]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldTouched,
    setValues,
    getFieldProps,
  };
};

export default useForm;
