"use client";

import { createContext, useContext, useState } from 'react';
import {
  createDemoId,
  enrollmentMetrics,
  initialCourses,
  resultMetrics,
} from './instructorData';

const InstructorContext = createContext(null);

export function InstructorProvider({ children }) {
  const [courses, setCourses] = useState(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourses[0].id);
  const [selectedModuleId, setSelectedModuleId] = useState(initialCourses[0].modules[0].id);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(initialCourses[0].evaluations[0].id);
  const [notice, setNotice] = useState('');

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? courses[0];
  const selectedModule = selectedCourse.modules.find((moduleItem) => moduleItem.id === selectedModuleId) ?? selectedCourse.modules[0];
  const selectedAssessment = selectedCourse.evaluations.find((assessment) => assessment.id === selectedAssessmentId) ?? selectedCourse.evaluations[0];

  const updateCourse = (courseId, updater) => {
    setCourses((current) => current.map((course) => (
      course.id === courseId ? updater(course) : course
    )));
  };

  const selectCourse = (courseId) => {
    const course = courses.find((item) => item.id === courseId);
    if (!course) return;
    setSelectedCourseId(course.id);
    setSelectedModuleId(course.modules[0]?.id ?? '');
    setSelectedAssessmentId(course.evaluations[0]?.id ?? '');
    setNotice('');
  };

  const addCourse = ({ title, description }) => {
    const course = {
      id: createDemoId(),
      title,
      description,
      instructor: 'Docente UMG',
      status: 'BORRADOR',
      modules: [],
      evaluations: [],
    };
    setCourses((current) => [...current, course]);
    setSelectedCourseId(course.id);
    setSelectedModuleId('');
    setSelectedAssessmentId('');
    setNotice('Curso creado como borrador. Puedes completar módulos y evaluaciones antes de publicarlo.');
  };

  const addModule = (title) => {
    const newModule = {
      id: createDemoId(),
      title,
      order: selectedCourse.modules.length + 1,
      lessons: [],
    };
    updateCourse(selectedCourse.id, (course) => ({ ...course, modules: [...course.modules, newModule] }));
    setSelectedModuleId(newModule.id);
    setNotice('Módulo añadido con su orden correspondiente.');
  };

  const addLesson = (moduleId, lessonData) => {
    const moduleItem = selectedCourse.modules.find((item) => item.id === moduleId);
    if (!moduleItem) return;
    const lesson = {
      id: createDemoId(),
      ...lessonData,
      order: moduleItem.lessons.length + 1,
    };
    updateCourse(selectedCourse.id, (course) => ({
      ...course,
      modules: course.modules.map((item) => (
        item.id === moduleId ? { ...item, lessons: [...item.lessons, lesson] } : item
      )),
    }));
    setNotice('Lección agregada al módulo.');
  };

  const addAssessment = (assessmentData) => {
    const assessment = {
      id: createDemoId(),
      ...assessmentData,
      questions: [],
    };
    updateCourse(selectedCourse.id, (course) => ({
      ...course,
      evaluations: [...course.evaluations, assessment],
    }));
    setSelectedAssessmentId(assessment.id);
    setNotice('Evaluación creada. Agrega preguntas y revisa sus opciones antes de publicarla.');
  };

  const updateAssessment = (assessmentId, updater) => {
    updateCourse(selectedCourse.id, (course) => ({
      ...course,
      evaluations: course.evaluations.map((assessment) => (
        assessment.id === assessmentId ? updater(assessment) : assessment
      )),
    }));
  };

  const addQuestion = (assessmentId, question) => {
    updateAssessment(assessmentId, (assessment) => ({
      ...assessment,
      questions: [...assessment.questions, { id: createDemoId(), ...question }],
    }));
    setNotice('Pregunta agregada a la evaluación.');
  };

  const value = {
    courses,
    selectedCourse,
    selectedCourseId,
    selectedModule,
    selectedModuleId,
    selectedAssessment,
    selectedAssessmentId,
    notice,
    setNotice,
    setSelectedModuleId,
    setSelectedAssessmentId,
    selectCourse,
    updateCourse,
    addCourse,
    addModule,
    addLesson,
    addAssessment,
    updateAssessment,
    addQuestion,
    enrollmentMetrics,
    resultMetrics,
  };

  return <InstructorContext.Provider value={value}>{children}</InstructorContext.Provider>;
}

export function useInstructor() {
  const context = useContext(InstructorContext);
  if (!context) {
    throw new Error('useInstructor debe utilizarse dentro de InstructorProvider.');
  }
  return context;
}
