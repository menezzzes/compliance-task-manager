Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # FRONTEND_URL accepts several origins separated by commas.
    origins ENV.fetch("FRONTEND_URL", "http://localhost:5173").split(",").map(&:strip)
    resource "*", headers: :any, methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end