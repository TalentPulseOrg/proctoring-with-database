import { useState } from 'react';
import { submitTest } from '../api/api';

/**
 * Custom hook for test submission with enhanced error handling and retry logic
 * @returns {Object} Test submission methods and state
 */
export function useTestSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  
  /**
   * Submit test with automatic retries and fallback
   * @param {string} sessionId - The session ID for the test
   * @param {Array} formattedAnswers - Formatted array of answers
   * @param {string} endTime - ISO string of end time
   * @param {Object} fallbackData - Data to use if submission fails
   * @returns {Object} Result object (either from server or local fallback)
   */
  const submitTestWithRetry = async (sessionId, answers, endTime, fallbackData) => {
    let result;
    let submitError;
    let submitSuccess = false;
    
    // Convert sessionId to number if it's a string
    const numericSessionId = typeof sessionId === 'string' ? 
        (isNaN(Number(sessionId)) ? Date.now() : Number(sessionId)) : 
        sessionId;

    // Try submission up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`Submission attempt ${attempt}...`);
            const response = await submitTest(numericSessionId, answers, endTime);
            
            if (response.error) {
                throw new Error(response.message);
            }
            
            result = response;
            submitSuccess = true;
            console.log(`Attempt ${attempt} succeeded!`);
            break;
        } catch (error) {
            submitError = error;
            console.warn(`Attempt ${attempt} failed:`, error.message);
            
            // Wait before retrying (exponential backoff)
            if (attempt < 3) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    if (!submitSuccess) {
        console.error("All submission attempts failed:", submitError);
        
        // Create minimal result from fallback data
        result = {
            id: numericSessionId,
            test_id: fallbackData.testId,
            user_id: fallbackData.candidateId,
            start_time: new Date(Date.now() - (fallbackData.duration * 60 * 1000)).toISOString(),
            end_time: endTime,
            score: fallbackData.score,
            total_questions: fallbackData.totalQuestions,
            percentage: fallbackData.percentage,
            status: "completed",
            user_name: fallbackData.candidateName,
            error_details: submitError?.message,
            submission_status: "local_fallback"
        };
    }

    return result;
  };
  
  /**
   * Calculate score based on answers and questions
   * @param {Object} answers - Object containing answers {questionIndex: selectedOption}
   * @param {Array} questions - Array of question objects
   * @returns {number} The calculated score
   */
  const calculateScore = (answers, questions) => {
    if (!questions || !answers) return 0;
    
    return questions.reduce((score, question, index) => {
      // Get the correct answer value depending on the format
      const correctAnswer = question.correct_answer || 
                           (question.options && question.options.findIndex(
                              opt => opt === question.correct_option || 
                                    (opt.id === question.correct_option_id)
                            ));
      
      // Get user's answer for this question
      const userAnswer = answers[index];
      
      // Skip if no answer was provided
      if (userAnswer === undefined || userAnswer === null) {
        return score;
      }
      
      // Check if the answer is correct
      const isCorrect = userAnswer === correctAnswer || 
                        (typeof correctAnswer === 'number' && userAnswer === correctAnswer) ||
                        (typeof correctAnswer === 'string' && userAnswer === correctAnswer);
      
      return score + (isCorrect ? 1 : 0);
    }, 0);
  };
  
  /**
   * Format answers for submission
   * @param {Object} answers - Object containing answers {questionIndex: selectedOption}
   * @param {Array} questions - Array of question objects
   * @returns {Array} Formatted answers for submission
   */
  const formatAnswers = (answers, questions) => {
    if (!questions || !answers) return [];
    
    return Object.keys(answers)
      .filter(questionIndex => answers[questionIndex] !== undefined)
      .map(questionIndex => {
        const question = questions[questionIndex];
        const questionId = question.id || parseInt(questionIndex);
        const selectedOption = answers[questionIndex];
        
        // Check if this answer is correct (for local scoring)
        const correctAnswer = question.correct_answer || 
                           (question.options && question.options.findIndex(
                              opt => opt === question.correct_option || 
                                    (opt.id === question.correct_option_id)
                            ));
        const isCorrect = selectedOption === correctAnswer;
        
        return {
          question_id: questionId,
          selected_option_id: selectedOption,
          is_correct: isCorrect  // Add this for local scoring if needed
        };
      });
  };
  
  return {
    isSubmitting,
    error,
    submitStatus,
    submitTestWithRetry,
    calculateScore,
    formatAnswers
  };
} 