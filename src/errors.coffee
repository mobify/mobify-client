class MError extends Error
    @error_code = 0
    @error_message = "No Message Provided."

    constructor: (message) ->
        Error.captureStackTrace @, MError
        message ||= @constructor.error_message

        formatted_message = "(#{@constructor.error_code}) #{message}"
        @message = formatted_message
        super formatted_message


exports.MError = MError

class ProjectFileNotFound extends MError
    @error_code = 100
    @error_message = "Project file, `project.json` could not be found."

    constructor: (message, filename) ->
        filename ||= 'project.json'
        message ||= "Project file, `#{filename}` could not be found."

        super message



exports.ProjectFileNotFound = ProjectFileNotFound
