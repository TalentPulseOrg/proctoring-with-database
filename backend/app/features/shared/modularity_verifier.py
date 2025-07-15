"""
Modularity Verifier

This script verifies that all features are completely modular and independent.
It checks for any remaining dependencies on the global violation system.

Usage:
    python -m app.features.shared.modularity_verifier
"""

import os
import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ModularityVerifier:
    """Verifier to ensure all features are completely modular"""
    
    # List of all features that should be modular
    FEATURES = [
        "camera_permission",
        "microphone_permission", 
        "browser_compatibility",
        "face_detection",
        "tab_switching",
        "window_blur",
        "fullscreen_enforcement",
        "keyboard_shortcuts",
        "lighting_analysis",
        "gaze_tracking",
        "audio_monitoring",
        "permission_logging"
    ]
    
    # Global violation system files that should NOT be imported
    GLOBAL_VIOLATION_FILES = [
        "app.models.violation",
        "app.services.violation_service",
        "app.routes.proctoring_api",
        "app.routes.violation_analytics",
        "app.routes.analytics"
    ]
    
    @staticmethod
    def check_feature_modularity(feature_name: str) -> Dict[str, Any]:
        """Check if a feature is completely modular"""
        feature_path = f"backend/app/features/{feature_name}"
        frontend_path = f"frontend/src/features/proctoring/{feature_name}"
        
        result = {
            "feature": feature_name,
            "backend_exists": os.path.exists(feature_path),
            "frontend_exists": os.path.exists(frontend_path),
            "has_models": False,
            "has_schemas": False,
            "has_services": False,
            "has_routes": False,
            "has_frontend": False,
            "global_dependencies": [],
            "modular": False
        }
        
        # Check backend files
        if result["backend_exists"]:
            result["has_models"] = os.path.exists(f"{feature_path}/models.py")
            result["has_schemas"] = os.path.exists(f"{feature_path}/schemas.py")
            result["has_services"] = os.path.exists(f"{feature_path}/services.py")
            result["has_routes"] = os.path.exists(f"{feature_path}/routes.py")
        
        # Check frontend files
        if result["frontend_exists"]:
            result["has_frontend"] = os.path.exists(f"{frontend_path}/index.js")
        
        # Check for global violation dependencies
        result["global_dependencies"] = ModularityVerifier.check_global_dependencies(feature_name)
        
        # Determine if feature is modular
        result["modular"] = (
            result["backend_exists"] and
            result["has_models"] and
            result["has_schemas"] and
            result["has_services"] and
            result["has_routes"] and
            result["has_frontend"] and
            len(result["global_dependencies"]) == 0
        )
        
        return result
    
    @staticmethod
    def check_global_dependencies(feature_name: str) -> List[str]:
        """Check if a feature has dependencies on global violation system"""
        dependencies = []
        feature_path = f"backend/app/features/{feature_name}"
        
        # Check all Python files in the feature
        for root, dirs, files in os.walk(feature_path):
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                            # Check for imports from global violation system
                            for global_file in ModularityVerifier.GLOBAL_VIOLATION_FILES:
                                if f"from {global_file}" in content or f"import {global_file}" in content:
                                    dependencies.append(f"{file}: imports {global_file}")
                                    
                    except Exception as e:
                        logger.error(f"Error reading {file_path}: {str(e)}")
        
        return dependencies
    
    @staticmethod
    def verify_all_features() -> Dict[str, Any]:
        """Verify all features are modular"""
        results = {}
        all_modular = True
        
        logger.info("Verifying modularity of all features...")
        
        for feature in ModularityVerifier.FEATURES:
            result = ModularityVerifier.check_feature_modularity(feature)
            results[feature] = result
            
            if result["modular"]:
                logger.info(f"✅ {feature}: MODULAR")
            else:
                logger.error(f"❌ {feature}: NOT MODULAR")
                all_modular = False
                
                if result["global_dependencies"]:
                    logger.error(f"   Global dependencies: {result['global_dependencies']}")
        
        return {
            "all_modular": all_modular,
            "features": results,
            "total_features": len(ModularityVerifier.FEATURES),
            "modular_features": sum(1 for r in results.values() if r["modular"]),
            "non_modular_features": sum(1 for r in results.values() if not r["modular"])
        }
    
    @staticmethod
    def generate_modularity_report() -> str:
        """Generate a comprehensive modularity report"""
        verification = ModularityVerifier.verify_all_features()
        
        report = []
        report.append("# Modularity Verification Report")
        report.append("")
        report.append(f"**Overall Status**: {'✅ ALL MODULAR' if verification['all_modular'] else '❌ NOT ALL MODULAR'}")
        report.append("")
        report.append(f"**Statistics**:")
        report.append(f"- Total Features: {verification['total_features']}")
        report.append(f"- Modular Features: {verification['modular_features']}")
        report.append(f"- Non-Modular Features: {verification['non_modular_features']}")
        report.append("")
        report.append("## Feature Details")
        report.append("")
        
        for feature_name, result in verification["features"].items():
            status = "✅ MODULAR" if result["modular"] else "❌ NOT MODULAR"
            report.append(f"### {feature_name}: {status}")
            report.append("")
            
            if not result["modular"]:
                report.append("**Issues:**")
                if not result["backend_exists"]:
                    report.append("- Backend folder missing")
                if not result["has_models"]:
                    report.append("- Models file missing")
                if not result["has_schemas"]:
                    report.append("- Schemas file missing")
                if not result["has_services"]:
                    report.append("- Services file missing")
                if not result["has_routes"]:
                    report.append("- Routes file missing")
                if not result["has_frontend"]:
                    report.append("- Frontend folder missing")
                if result["global_dependencies"]:
                    report.append("- Global violation dependencies:")
                    for dep in result["global_dependencies"]:
                        report.append(f"  - {dep}")
                report.append("")
        
        return "\n".join(report)

def run_modularity_verification():
    """Run the complete modularity verification"""
    try:
        logger.info("Starting modularity verification...")
        
        verification = ModularityVerifier.verify_all_features()
        
        if verification["all_modular"]:
            logger.info("🎉 ALL FEATURES ARE MODULAR!")
            logger.info(f"✅ {verification['modular_features']}/{verification['total_features']} features are modular")
        else:
            logger.error("❌ SOME FEATURES ARE NOT MODULAR!")
            logger.error(f"❌ {verification['non_modular_features']} features need to be made modular")
            
            for feature_name, result in verification["features"].items():
                if not result["modular"]:
                    logger.error(f"  - {feature_name}: {result['global_dependencies']}")
        
        # Generate report
        report = ModularityVerifier.generate_modularity_report()
        with open("MODULARITY_REPORT.md", "w") as f:
            f.write(report)
        
        logger.info("Modularity report saved to MODULARITY_REPORT.md")
        
        return verification["all_modular"]
        
    except Exception as e:
        logger.error(f"Error in modularity verification: {str(e)}")
        return False

if __name__ == "__main__":
    run_modularity_verification() 