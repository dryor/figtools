# Get Figma information from the command line

## Get the information of a single URL with no flags
* The user runs the CLI with a single Figma URL, with no additional flags
* The system prints the information for that URL to stdout, in json format

## Get the information of several URLs in a single invocation
* The user runs the CLI with several Figma URLs that resolve successfully
* The system prints the information for each of those URLs to stdout

## One URL failing doesn't prevent getting the others
* The user runs the CLI with several Figma URLs, and one of them doesn't exist or isn't accessible
* The system prints the information of the URLs that did resolve to stdout

## The final summary reports which URLs failed and why
* The user runs the CLI with several Figma URLs, and one of them doesn't exist or isn't accessible
* When it finishes, the system prints a summary to stderr that marks that URL as failed, along with the reason

## At least one URL fails
* The user runs the CLI with several Figma URLs, and one of them doesn't exist or isn't accessible
* The process exits with exit code 1

## All URLs resolve successfully
* The user runs the CLI with one or more Figma URLs, and all of them resolve successfully
* The process exits with exit code 0

## json format with no --output prints to stdout
* The user runs the CLI with --format json, with no --output
* The system prints the result to stdout
* The system doesn't write any file

## markdown format with no --output writes to the current directory
* The user runs the CLI with --format markdown, with no --output
* The system writes the markdown file tree to the current directory

## --output with a .json extension is treated as the destination file
* The user runs the CLI with --format json and --output pointing to a path ending in .json, resolving a single URL
* The system writes the result exactly to that file path

## --output with no extension is treated as the destination directory
* The user runs the CLI with --format json and --output pointing to a path with no extension, resolving several URLs
* The system creates that directory if it doesn't exist
* The system writes a json file per resolved URL inside that directory, named from its fileKey and nodeId

## A relative path in --output is resolved against the current directory
* The user runs the CLI with --output pointing to a relative path, with no leading /
* The system resolves that path based on the directory the command was run from

## An absolute path in --output is used as-is
* The user runs the CLI with --output pointing to an absolute path, with a leading /
* The system uses that path exactly as given, without resolving it against any other directory

## Reject an unsupported --output extension
* The user runs the CLI with --output pointing to a path whose extension isn't .json or .md
* The system returns an error indicating that extension isn't supported
* The system doesn't attempt to resolve any URL
* The process exits with exit code 1

## --format markdown with --output is always treated as a directory
* The user runs the CLI with --format markdown and --output pointing to a path with a .md extension
* The system treats that path as the destination directory, not as the single output file

## markdown format names each file after the node's name in Figma
* The user runs the CLI with --format markdown on a URL
* The system names each file or folder from the name that node has in Figma, not its nodeId
* The file or folder name uses a slug of the node's name (lowercase, spaces replaced with hyphens)

## A node with no children is saved as a single markdown file
* The user runs the CLI with --format markdown on a URL whose node has no children
* The system generates a single markdown file for that node, named after the slug of its name

## A node with children is saved as a folder with its own index
* The user runs the CLI with --format markdown on a URL whose node has children
* The system creates a folder named after the slug of that node's name
* Inside that folder, the system saves the node's information in an index.md file

## The node hierarchy is reflected in the folder hierarchy
* The user runs the CLI with --format markdown on a URL whose node has children nested at several levels
* The system places each child's file or folder inside its parent node's folder, mirroring the same depth they have in Figma

## A node's index links to its children
* The user runs the CLI with --format markdown on a URL whose node has children
* That node's index.md file includes a link to each of its children

## Sibling nodes with the same name don't collide
* The user runs the CLI with --format markdown on a URL whose node has several direct children with the same name in Figma
* The system appends a bracketed suffix with the order of appearance (for example [2], [3]) to the slug of each repeated child, starting from the second
* The first child with that name doesn't get a suffix

## Several URLs with --format markdown don't collide with each other
* The user runs the CLI with --format markdown and several URLs belonging to different Figma files
* The system writes the markdown files for each URL inside a separate subfolder, named after that URL's fileKey

## Writing over an output folder with previous content
* The user runs the CLI pointing --output at a folder that already contains files from a previous run with the same names
* The system overwrites the files that match in name, without asking for confirmation

## Log in automatically on first use
* The user runs the CLI to resolve a URL, without having a saved session
* The system starts the interactive login process automatically, with no extra command or flag required
* Once the login completes, the system continues resolving the originally requested URL

## Reuse the saved session on later uses
* The user runs the CLI to resolve a URL, with a valid saved session
* The system resolves the URL without starting the login process

## Force a new login explicitly
* The user runs the CLI's login subcommand directly, without providing any URL
* The system starts the interactive login process, regardless of whether the current session is still valid
* The system saves the new session for later use

## Reduce progress output with --quiet
* The user runs the CLI with --quiet
* The system doesn't print progress messages to stderr while processing the URLs
* The system still prints the final result and the failure summary, if there is one

## Reject the invocation with no URL at all
* The user runs the CLI without providing any URL
* The system returns a validation error indicating at least one URL is required
* The system doesn't start any login or resolution process
* The process exits with exit code 1

## Report a validation error for a specific URL
* The user runs the CLI with an empty URL or one that doesn't belong to Figma, among the arguments
* The system reports that specific URL's validation error in the final stderr summary
* The system continues processing the rest of the provided URLs
