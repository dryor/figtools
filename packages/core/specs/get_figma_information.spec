# Get information about Figma nodes and files

ADR: [ADR-figtools-core](../adr/ADR-figtools-core.md)

* The user has a valid session, with at least read permission on the file

## Get a specific node from a Figma design with edit permission
* The user has edit permission on the file
* The user provides the URL of a specific node in a Figma file
* The system returns that node, including its type, position, size, styles, visibility, a representative image, and the full hierarchy of its children

## Get a specific node from a Figma design with read-only permission
* The user has read-only permission on the file, in an organization that enables the inspect panel for viewers
* The user provides the URL of a specific node in a Figma file
* The system returns that node, including its type, position, size, styles, visibility, a representative image, and the full hierarchy of its children

## Get a specific node with no data panel available
* The user has read-only permission on the file, in an organization that does not enable the inspect panel for viewers
* The user provides the URL of a specific node in a Figma file
* The system returns an error indicating it couldn't read the node's complete data
* The system doesn't return partial information

## Get the nodes of a page in a Figma design
* The user provides the URL of a page in a Figma file
* The system returns the top-level nodes of that page, each with its full hierarchy of children

## Get the nodes of the default page in a Figma design
* The user provides a Figma URL that doesn't point to any specific node
* The system returns the top-level nodes of the file's default page, each with its full hierarchy of children

## Nonexistent or inaccessible node or file
* The user provides the URL of a node or file that doesn't exist or that they don't have access to
* The system returns an error indicating the node or file doesn't exist or isn't accessible
* The system doesn't return partial information

## Reject an empty URL
* The user provides an empty URL
* The system returns a validation error indicating the URL can't be empty
* The system doesn't attempt to fetch any data

## Reject a URL that isn't from Figma
* The user provides a URL that doesn't belong to Figma
* The system returns a validation error indicating the URL isn't from Figma
* The system doesn't attempt to fetch any data
