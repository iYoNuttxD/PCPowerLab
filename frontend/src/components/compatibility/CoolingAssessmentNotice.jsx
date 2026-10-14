import { hasUnverifiedCooling } from '../../utils/coolingAssessment.js';

export default function CoolingAssessmentNotice({ result }) {
  return hasUnverifiedCooling(result)
    ? <p className="hint-text cooling-verification-notice">Refrigeração não verificada</p> : null;
}
