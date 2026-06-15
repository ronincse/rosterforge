# Compatibility

## Implemented

- Uncompressed BattleScribe 2.03-style `.gst` and `.cat` XML ingestion
- ZIP-based `.gstz` and `.catz` ingestion with one matching XML entry
- Root metadata projection for game systems and catalogues
- Ordered preservation of unknown XML elements and attributes
- Original imported-source and extracted-document byte retention
- DTD/entity declaration rejection and configurable size limits

## Parsed But Not Evaluated

- All child XML content, including entries, links, rules, profiles, costs,
  constraints, modifiers, conditions, and repeats
- Unknown elements, attributes, and namespaces

## Deferred

- Catalogue dependency resolution and shared-object resolution
- Roster construction and `.ros`/`.rosz`
- Costs, constraints, modifiers, conditions, and validation evaluation
- IndexedDB, GitHub import, and user interface

## Uncertain

- Full tolerance parity with BattleScribe for malformed XML
- Non-ZIP compressed files mislabeled as `.gstz` or `.catz`
- Archives containing metadata or more than one candidate XML document

Uncertain or unsupported behavior must be diagnosed rather than silently
accepted in later layers.
