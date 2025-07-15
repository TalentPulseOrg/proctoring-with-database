"""
Shared Utilities for Modular Features

This module contains shared utilities that all modular features can use.
"""

from .base_violation import BaseViolation
from .violation_logger import ModularViolationLogger
from .modular_violation_migration import ModularViolationMigration

__all__ = [
    'BaseViolation',
    'ModularViolationLogger', 
    'ModularViolationMigration'
] 